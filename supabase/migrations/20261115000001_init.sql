-- MailCraft AI – initial schema
-- All user data is isolated with Row Level Security keyed on auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user preferences
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  editor_font_size smallint not null default 13 check (editor_font_size between 10 and 24),
  editor_word_wrap boolean not null default false,
  editor_minimap boolean not null default true,
  autosave boolean not null default true,
  default_viewport text not null default 'desktop' check (default_viewport in ('desktop', 'tablet', 'mobile')),
  ai_model text check (ai_model is null or char_length(ai_model) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- create profile + preferences on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- accounts that signed up before this schema existed
insert into public.profiles (id, display_name)
  select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)) from auth.users
  on conflict (id) do nothing;
insert into public.user_preferences (user_id) select id from auth.users on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- projects (an email being developed)
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 1000),
  html text not null default '' check (octet_length(html) <= 1048576),
  subject text check (char_length(subject) <= 250),
  preheader text check (char_length(preheader) <= 250),
  tags text[] not null default '{}',
  source_template_id uuid,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_updated_idx on public.projects (user_id, updated_at desc);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email versions (immutable snapshots)
-- ---------------------------------------------------------------------------
create table public.email_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version_number integer not null,
  html text not null check (octet_length(html) <= 1048576),
  message text check (char_length(message) <= 300),
  source text not null default 'manual'
    check (source in ('manual', 'autosave', 'ai', 'restore', 'upload', 'template', 'create')),
  size_bytes integer generated always as (octet_length(html)) stored,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create index email_versions_project_idx on public.email_versions (project_id, version_number desc);

-- assign the next version number atomically
create or replace function public.assign_version_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.project_id::text));
  select coalesce(max(version_number), 0) + 1 into new.version_number
  from public.email_versions where project_id = new.project_id;
  return new;
end;
$$;

create trigger email_versions_number before insert on public.email_versions
  for each row execute function public.assign_version_number();

-- ---------------------------------------------------------------------------
-- template categories + templates
-- ---------------------------------------------------------------------------
create table public.template_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order smallint not null default 0
);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- NULL = built-in demo template
  category_id uuid references public.template_categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 1000),
  html text not null check (octet_length(html) <= 1048576),
  tags text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_templates_have_no_owner check ((is_system and user_id is null) or (not is_system and user_id is not null))
);

create index email_templates_user_idx on public.email_templates (user_id, updated_at desc);
create index email_templates_category_idx on public.email_templates (category_id);

create trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

alter table public.projects
  add constraint projects_source_template_fk foreign key (source_template_id)
  references public.email_templates (id) on delete set null;

-- ---------------------------------------------------------------------------
-- saved components
-- ---------------------------------------------------------------------------
create table public.saved_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade, -- NULL = built-in
  kind text not null check (char_length(kind) between 1 and 40),
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 1000),
  html text not null check (octet_length(html) <= 262144),
  tags text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_components_have_no_owner check ((is_system and user_id is null) or (not is_system and user_id is not null))
);

create index saved_components_user_idx on public.saved_components (user_id, kind);

create trigger saved_components_updated_at before update on public.saved_components
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- analysis reports
-- ---------------------------------------------------------------------------
create table public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  version_id uuid references public.email_versions (id) on delete set null,
  kind text not null check (kind in ('validation', 'compatibility', 'ai', 'qa')),
  title text not null check (char_length(title) <= 200),
  score smallint check (score between 0 and 100),
  counts jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  summary text,
  html_hash text,
  model text,
  created_at timestamptz not null default now()
);

create index analysis_reports_user_idx on public.analysis_reports (user_id, created_at desc);
create index analysis_reports_project_idx on public.analysis_reports (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- activity log
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_user_idx on public.activity_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- rate limiting (fixed window, serverless-safe)
-- ---------------------------------------------------------------------------
create table public.api_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, bucket, window_start)
);

create or replace function public.consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid limit';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits as r (user_id, bucket, window_start, request_count)
  values (v_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
  do update set request_count = r.request_count + 1
  returning r.request_count into v_count;

  -- housekeeping: drop this user's expired windows
  delete from public.api_rate_limits
  where user_id = v_user and window_start < now() - make_interval(secs => p_window_seconds * 2);

  return query select v_count <= p_limit, greatest(p_limit - v_count, 0), v_window + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- dashboard stats (real counts, one round trip)
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'projects', (select count(*) from public.projects where user_id = auth.uid()),
    'templates', (select count(*) from public.email_templates where user_id = auth.uid()),
    'versions', (select count(*) from public.email_versions where user_id = auth.uid()),
    'reports', (select count(*) from public.analysis_reports where user_id = auth.uid()),
    'open_issues', coalesce((
      select sum(
        coalesce((r.counts ->> 'critical')::int, 0) + coalesce((r.counts ->> 'high')::int, 0)
        + coalesce((r.counts ->> 'medium')::int, 0) + coalesce((r.counts ->> 'low')::int, 0))
      from (
        select distinct on (project_id) counts
        from public.analysis_reports
        where user_id = auth.uid() and project_id is not null and kind in ('qa', 'compatibility', 'validation')
        order by project_id, created_at desc
      ) r
    ), 0),
    'compat_issues', coalesce((
      select sum(coalesce((r.counts ->> 'compat_unsupported')::int, 0) + coalesce((r.counts ->> 'compat_partial')::int, 0))
      from (
        select distinct on (project_id) counts
        from public.analysis_reports
        where user_id = auth.uid() and project_id is not null and kind in ('qa', 'compatibility')
        order by project_id, created_at desc
      ) r
    ), 0)
  );
$$;

grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.projects enable row level security;
alter table public.email_versions enable row level security;
alter table public.template_categories enable row level security;
alter table public.email_templates enable row level security;
alter table public.saved_components enable row level security;
alter table public.analysis_reports enable row level security;
alter table public.activity_log enable row level security;
alter table public.api_rate_limits enable row level security; -- no policies: only reachable via consume_rate_limit()

-- profiles
create policy "profiles: read own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- preferences
create policy "prefs: read own" on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "prefs: insert own" on public.user_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy "prefs: update own" on public.user_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- projects
create policy "projects: read own" on public.projects for select to authenticated using (user_id = (select auth.uid()));
create policy "projects: insert own" on public.projects for insert to authenticated with check (user_id = (select auth.uid()));
create policy "projects: update own" on public.projects for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "projects: delete own" on public.projects for delete to authenticated using (user_id = (select auth.uid()));

-- versions: immutable; may only be attached to the caller's own project
create policy "versions: read own" on public.email_versions for select to authenticated using (user_id = (select auth.uid()));
create policy "versions: insert own" on public.email_versions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()))
  );
create policy "versions: delete own" on public.email_versions for delete to authenticated using (user_id = (select auth.uid()));

-- categories: read-only reference data
create policy "categories: read" on public.template_categories for select to authenticated using (true);

-- templates: built-ins readable by everyone signed in, own templates fully managed
create policy "templates: read built-in or own" on public.email_templates for select to authenticated
  using (is_system or user_id = (select auth.uid()));
create policy "templates: insert own" on public.email_templates for insert to authenticated
  with check (user_id = (select auth.uid()) and not is_system);
create policy "templates: update own" on public.email_templates for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and not is_system);
create policy "templates: delete own" on public.email_templates for delete to authenticated using (user_id = (select auth.uid()));

-- components: same pattern
create policy "components: read built-in or own" on public.saved_components for select to authenticated
  using (is_system or user_id = (select auth.uid()));
create policy "components: insert own" on public.saved_components for insert to authenticated
  with check (user_id = (select auth.uid()) and not is_system);
create policy "components: update own" on public.saved_components for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and not is_system);
create policy "components: delete own" on public.saved_components for delete to authenticated using (user_id = (select auth.uid()));

-- reports
create policy "reports: read own" on public.analysis_reports for select to authenticated using (user_id = (select auth.uid()));
create policy "reports: insert own" on public.analysis_reports for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
create policy "reports: delete own" on public.analysis_reports for delete to authenticated using (user_id = (select auth.uid()));

-- activity
create policy "activity: read own" on public.activity_log for select to authenticated using (user_id = (select auth.uid()));
create policy "activity: insert own" on public.activity_log for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (project_id is null or exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid())))
  );
