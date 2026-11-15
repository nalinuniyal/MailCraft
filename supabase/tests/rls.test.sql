-- RLS isolation tests. Run after supabase-shim.sql + migrations + seed.sql.
-- Every failure raises an exception; success prints "RLS TESTS PASSED".
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test');

-- signup trigger created profile + prefs
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'profiles not created by trigger';
  assert (select count(*) from public.user_preferences) = 2, 'prefs not created by trigger';
end $$;

-- ---------- act as Alice ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

insert into public.projects (name, html) values ('Alice welcome', '<p>hi</p>');
insert into public.email_versions (project_id, html, message)
  select id, '<p>hi</p>', 'v1' from public.projects;
insert into public.email_versions (project_id, html, message)
  select id, '<p>hi 2</p>', 'v2' from public.projects;
insert into public.analysis_reports (project_id, kind, title, counts)
  select id, 'qa', 'QA', '{"critical":1,"high":2,"medium":0,"low":1,"compat_unsupported":3,"compat_partial":1}' from public.projects;
insert into public.email_templates (name, html) values ('Alice tpl', '<p>t</p>');

do $$ begin
  assert (select max(version_number) from public.email_versions) = 2, 'version numbering broken';
  assert (select (public.dashboard_stats() ->> 'projects')::int) = 1, 'stats projects';
  assert (select (public.dashboard_stats() ->> 'open_issues')::int) = 4, 'stats open issues';
  assert (select (public.dashboard_stats() ->> 'compat_issues')::int) = 4, 'stats compat issues';
  assert (select (public.dashboard_stats() ->> 'templates')::int) = 1, 'stats templates';
end $$;

-- cannot forge ownership
do $$ begin
  begin
    insert into public.projects (user_id, name) values ('00000000-0000-0000-0000-00000000000b', 'forged');
    raise exception 'forged project insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.email_templates (name, html, is_system, user_id) values ('sys', 'x', true, null);
    raise exception 'user created a system template';
  exception when insufficient_privilege or check_violation then null; end;
end $$;

-- rate limiter
do $$
declare r record;
begin
  select * into r from public.consume_rate_limit('ai', 2, 3600);
  assert r.allowed and r.remaining = 1, 'rate limit first call';
  select * into r from public.consume_rate_limit('ai', 2, 3600);
  assert r.allowed and r.remaining = 0, 'rate limit second call';
  select * into r from public.consume_rate_limit('ai', 2, 3600);
  assert not r.allowed, 'rate limit should block third call';
end $$;

-- direct table access to rate limits is denied by RLS (no rows visible)
do $$ begin
  assert (select count(*) from public.api_rate_limits) = 0, 'rate limit table should be invisible';
end $$;

-- ---------- act as Bob ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

do $$
declare alice_project uuid;
begin
  assert (select count(*) from public.projects) = 0, 'bob can see alice projects';
  assert (select count(*) from public.email_versions) = 0, 'bob can see alice versions';
  assert (select count(*) from public.analysis_reports) = 0, 'bob can see alice reports';
  assert (select count(*) from public.email_templates where not is_system) = 0, 'bob can see alice templates';
  assert (select count(*) from public.profiles) = 1, 'bob sees other profiles';
  assert (select (public.dashboard_stats() ->> 'projects')::int) = 0, 'bob stats leak';

  -- bob cannot attach a version to alice's project even if he knows the id
  reset role;
  select id into alice_project from public.projects limit 1;
  set role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
  begin
    insert into public.email_versions (project_id, html) values (alice_project, 'pwn');
    raise exception 'bob attached a version to alice project';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.analysis_reports (project_id, kind, title) values (alice_project, 'qa', 'x');
    raise exception 'bob attached a report to alice project';
  exception when insufficient_privilege then null; end;

  update public.projects set name = 'pwned' where id = alice_project;
  delete from public.projects where id = alice_project;
end $$;

-- versions are immutable even for their owner
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.email_versions set html = 'changed';
do $$ begin
  assert (select count(*) from public.email_versions where html = 'changed') = 0, 'versions should be immutable';
  assert (select name from public.projects limit 1) = 'Alice welcome', 'bob modified alice project';
end $$;

-- ---------- anonymous ----------
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.projects) = 0, 'anon sees projects';
  assert (select count(*) from public.email_templates) = 0, 'anon sees templates';
end $$;
reset role;

select 'RLS TESTS PASSED' as result;
