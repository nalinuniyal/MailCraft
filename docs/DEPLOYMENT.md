# Deploying MailCraft AI (Vercel + Supabase)

This guide takes a fresh clone to a production deployment. It takes about 20 minutes. Nothing here needs a paid plan to try out, but read the notes on limits at the end before real users arrive.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com). Pick the region closest to your Vercel region (Vercel defaults to `iad1`, Washington DC, so `us-east-1` is a good match).
2. Apply the schema and seed. Either use the SQL editor (paste each file in `supabase/migrations/` in order, then `supabase/seed.sql`), or the CLI:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push                                  # applies supabase/migrations
   psql "$(supabase db url)" -f supabase/seed.sql    # or paste seed.sql in the SQL editor
   ```

   The seed is idempotent: re-running it updates the built-in templates and components and never touches user rows. After changing `scripts/seed/*.mjs`, run `npm run seed:build` and apply `seed.sql` again.
3. **Auth → URL configuration**
   - Site URL: your production URL, for example `https://mailcraft.example.com`.
   - Redirect URLs: add `https://mailcraft.example.com/auth/confirm` and, for preview deploys, `https://*-<your-team>.vercel.app/auth/confirm`.
4. **Auth → Providers → Email**: keep "Confirm email" on in production. Sign-up then sends a confirmation link to `/auth/confirm`. Configure a custom SMTP sender (Auth → SMTP) before launch, because Supabase's built-in sender is heavily rate limited.
5. **Project settings → API**: copy the project URL and the anon (or publishable) key. Never use the `service_role` key in this app. Every query runs as the signed-in user and Row Level Security does the access control.

### What RLS protects
Every table (`profiles`, `user_preferences`, `projects`, `email_versions`, `analysis_reports`, `email_templates`, `saved_components`, `activity_log`, `template_categories`, `api_rate_limits`) has RLS enabled. User rows have owner-only policies, and `api_rate_limits` has no policies at all, so it is reachable only through the `consume_rate_limit()` function. Built-in templates and components (`is_system = true`, no owner) are readable by everyone and writable by no one. `npm run test:db` proves isolation between two users against a throwaway Postgres.

## 2. AI provider

Pick one: Anthropic Claude (`ANTHROPIC_API_KEY`), xAI Grok (`XAI_API_KEY` or `GROK_API_KEY`, from console.x.ai) or Groq (`GROQ_API_KEY`, from console.groq.com, which has a free tier with low per-minute limits). Set `AI_PROVIDER` if more than one key is present. The rest of this section describes Claude.


Create an API key in the [Claude Console](https://console.anthropic.com) under a workspace with a spend limit you are comfortable with. The key is read only in server code (`src/lib/ai/anthropic.ts` imports `server-only`), so the build fails if anything tries to import it into the browser bundle. Without a key the app still works, the AI tab says AI isn't configured, and the AI routes return `503 ai_not_configured`.

Models: AI analysis and fixes use `claude-opus-5-5`; the assistant chat uses `claude-sonnet-5-5`. Override with `ANTHROPIC_MODEL_ANALYZE` and `ANTHROPIC_MODEL_ASSIST`.

## 3. Vercel

1. Import the GitHub repository in Vercel. The framework preset (Next.js) and build command (`npm run build`) are detected automatically. `postinstall` copies Monaco into `public/monaco`, so the editor is served from your own domain and needs no CDN.
2. Add environment variables (Project → Settings → Environment Variables) for Production and Preview:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon or publishable key |
   | `NEXT_PUBLIC_SITE_URL` | yes | production URL, used in auth emails |
   | `ANTHROPIC_API_KEY`, `XAI_API_KEY`/`GROK_API_KEY` or `GROQ_API_KEY` | one, for AI | mark as **Sensitive** |
   | `AI_PROVIDER` | no | `anthropic`, `xai` or `groq` |
   | `AI_MODEL_ANALYZE`, `AI_MODEL_ASSIST` | no | model overrides |
   | `AI_RATE_LIMIT_PER_HOUR` | no | default 30 per user |
   | `AI_MAX_HTML_BYTES` | no | default 400000 |
   | `ANALYZE_RATE_LIMIT_PER_HOUR` | no | full analysis runs, default 300 |
   | `LINK_CHECK_RATE_LIMIT_PER_HOUR` | no | default 20 |
   | `PROJECT_CREATE_RATE_LIMIT_PER_HOUR` | no | default 100 |
   | `REPORT_RATE_LIMIT_PER_HOUR` | no | QA reports, default 60 |
   | `LIBRARY_WRITE_RATE_LIMIT_PER_HOUR` | no | template and component saves, default 120 |

   `NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing them.
3. Deploy. Then open `https://<your-domain>/api/health`. It should return `{"ok":true,"supabase":"configured","ai":"configured","aiProvider":"groq",…}`. It reports whether settings are present; it never returns secrets.
4. Add your custom domain, then update the Supabase Site URL and redirect URLs to match.

### Function duration
AI analysis on a large email can take 30 to 60 seconds. The AI routes and the link checker set `maxDuration = 60`. That works on Vercel Pro and on Hobby with Fluid Compute (the default for new projects). If you see 504s on a plan with a shorter limit, lower `AI_MAX_HTML_BYTES`.

## 4. Security checklist

These are on by default; this list is what to verify after deploying.

- **CSP**: every response carries a per-request nonce policy (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `frame-ancestors 'self'`). `connect-src` allows only your app and your Supabase URL. Check the response headers of any page.
- **Email previews**: user HTML is sanitized (scripts, iframes, objects, embeds, `<base>`, event handlers and `javascript:` URLs removed) and rendered in `<iframe sandbox>` without `allow-scripts` or `allow-same-origin`. The editor keeps your source exactly as written; only the preview copy is sanitized.
- **Uploads**: `.html`, `.htm` or `.txt` only, checked by extension, MIME type and content, max 1 MB (also enforced by a database check constraint). Server actions reject bodies over 1.5 MB.
- **Rate limits**: per user, per hour, stored in Postgres (`consume_rate_limit`), so they hold across serverless instances.
- **Headers**: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, a restrictive `Permissions-Policy`.
- **Keys**: confirm no AI key is in the client bundle: `grep -rE "sk-ant|xai-|gsk_" .next/static` should print nothing.

## 5. Testing before you ship

```bash
npm run lint && npm run typecheck && npm test   # static checks + unit tests
npm run test:db                                 # RLS isolation (needs PGURL)
bash e2e/stack/up.sh                            # local Supabase-compatible stack in Docker
cp .env.e2e .env.local && npm run build
npm run test:e2e                                # Playwright, starts `next start` on :3100
```

Set `E2E_BASE_URL` to run the Playwright suite against an existing server, such as a Vercel preview deployment (email confirmation must be off in that Supabase project, because the tests sign up new users).

## 6. Before real users

- Turn on Supabase Point-in-Time Recovery or daily backups.
- Set a monthly spend limit on the Anthropic workspace; per-user AI limits are hourly, not monthly.
- Add an uptime monitor on `/api/health`.
- The free Supabase tier pauses inactive projects after a week; use a paid plan for production.
