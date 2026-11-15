# MailCraft AI – Email Developer Studio

An AI-assisted studio for HTML email developers: write, upload, validate, debug, preview and QA email templates.

> **Honest previews.** Viewport and client "profiles" are simulations (viewport size, known client limitations, Can I Email-based warnings, dark-mode approximation). They do **not** reproduce Gmail, Outlook or Apple Mail rendering engines. Real screenshots require a Litmus / Email on Acid integration (see `docs/ARCHITECTURE.md`).

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Monaco Editor · Supabase (Postgres, Auth, RLS) · Anthropic Claude API (server-side only) · Vercel.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

### 1. Supabase
1. Create a project at supabase.com.
2. Apply the schema: run every file in `supabase/migrations/` (in order) and then `supabase/seed.sql` in the SQL editor, or with the CLI: `supabase link --project-ref <ref> && supabase db push && psql "$DB_URL" -f supabase/seed.sql`.
3. Auth → URL configuration: set **Site URL** to your app URL and add `<app-url>/auth/confirm` to redirect URLs.
4. Copy the project URL and anon/publishable key into `.env.local`.

### 2. Anthropic
Set `ANTHROPIC_API_KEY`. It is only read in server code (`src/lib/ai/anthropic.ts`, marked `server-only`) and never shipped to the browser. Without it the AI tab says AI isn't configured and the AI routes return `503`; nothing is simulated.

How the AI features work:
- **AI analysis** (`POST /api/ai/analyze`, `claude-opus-5-5`): structured findings with severity, explanation and an optional fix. Saved as an `analysis_reports` row of kind `ai` keyed by the HTML's SHA-256, so QA reports include it only for the exact same version.
- **Fix with AI** (`POST /api/ai/fix`): fixes one validator or AI finding.
- **Assistant** (`POST /api/ai/assist`, `claude-sonnet-5-5`): chat about the email, optionally with the editor selection.
- Every change is returned as exact find/replace patches. The user reviews them in a side-by-side diff, picks which to apply, and can undo. Applying saves a version with source `ai`. Claude never writes to the project on its own.
- Requests use structured outputs (JSON Schema, re-validated with zod), streaming, prompt caching for the system prompt, and server-side refusal fallbacks (`fallbacks: "default"`).
- Each user gets `AI_RATE_LIMIT_PER_HOUR` AI calls per hour (Postgres-backed), and HTML over `AI_MAX_HTML_BYTES` is not sent to Claude.

### Environment variables
| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon or publishable key; RLS protects all data |
| `NEXT_PUBLIC_SITE_URL` | recommended | used for auth email redirects |
| `ANTHROPIC_API_KEY` | for AI features | server only |
| `ANTHROPIC_MODEL_ANALYZE` | no | default `claude-opus-5-5` |
| `ANTHROPIC_MODEL_ASSIST` | no | default `claude-sonnet-5-5` |
| `AI_RATE_LIMIT_PER_HOUR` | no | default 30 |
| `AI_MAX_HTML_BYTES` | no | default 400000 |
| `LINK_CHECK_RATE_LIMIT_PER_HOUR` | no | default 20 |

Without Supabase variables the app shows a `/setup` page instead of crashing.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | unit tests (Vitest) |
| `npm run test:db` | applies migrations to a throwaway Postgres DB and runs RLS isolation tests (`PGURL` = superuser URL) |
| `npm run test:e2e` | Playwright end-to-end tests against a running app + local stack |
| `e2e/stack/up.sh` | starts a local Supabase-compatible stack in Docker (Postgres + GoTrue + PostgREST) and writes `.env.e2e` |

## Project layout
See `docs/ARCHITECTURE.md` for the architecture, folder structure, schema and phase plan.

## Data sources
Compatibility data: [Can I Email](https://www.caniemail.com) via the MIT-licensed `caniemail` npm package. The snapshot date is shown in the UI.
