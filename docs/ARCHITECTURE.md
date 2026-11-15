# MailCraft AI – Email Developer Studio: Architecture & Plan

## 1. Architecture

**Runtime:** Next.js 16 (App Router, React Server Components, Route Handlers) on Vercel, TypeScript strict, Tailwind CSS v4 + shadcn/ui, lucide icons, next-themes (dark default / light), sonner toasts.

**Data & auth:** Supabase Postgres + Supabase Auth via `@supabase/ssr` (cookie sessions refreshed in `proxy.ts`). Every user-owned row carries `user_id` and is protected by Row Level Security. The browser only ever holds the anon/publishable key; no service-role key is used by the app.

**Editor:** Monaco (`@monaco-editor/react`, bundled locally, no CDN) with HTML/CSS highlighting, folding, find/replace, undo/redo; a custom AMPscript language (Monarch tokenizer). Formatting via Prettier standalone (HTML parser) in the browser. Diff review with Monaco DiffEditor.

**Preview (safe by construction):**
- HTML is rendered only in `<iframe sandbox>` with **no** `allow-scripts` and **no** `allow-same-origin`, fed through `srcdoc`, plus an injected CSP meta (`script-src 'none'`).
- An email-aware sanitizer (htmlparser2) strips `<script>`, `<object>`, `<embed>`, `<iframe>`, `<base>`, meta refresh, `on*` handlers and `javascript:`/`vbscript:`/`data:text/html` URLs while **preserving** MSO conditional comments and VML, which email developers need.
- Viewports: desktop / tablet / mobile / custom width. Client "profiles" (Gmail, Outlook Desktop, Outlook Web, Apple Mail, Yahoo) are labelled as *simulations*: they apply viewport + known-limitation overlays (e.g. strip `<style>` for Gmail non-Google-account / clip at 102 KB) and list Can I Email-based warnings. The UI states clearly that they do not reproduce the real rendering engines.
- Dark-mode simulation: forced-colour-inversion approximation and `prefers-color-scheme: dark` emulation, both labelled as approximations.
- `RenderingProvider` interface (`lib/rendering/providers`) reserved for Litmus / Email on Acid real screenshots later.

**Analysis engine (deterministic, shared client/server):** `lib/email/`
- `parse.ts` – htmlparser2 with line/column tracking.
- `validate.ts` – unclosed/mismatched tags, invalid nesting, duplicate IDs, missing doctype/charset/viewport/lang/title, missing `alt`, images without width/height, empty/`#`/`javascript:` links, fixed widths > 600px, size > 102 KB (Gmail clipping), etc. Each issue: severity, title, description, line, why it matters, recommendation, suggested code.
- `compat.ts` – extracts CSS properties, at-rules, selectors, HTML elements/attributes (css-tree) and maps them to **Can I Email** features. Data comes from the MIT-licensed `caniemail` npm package snapshot (`data/caniemail.json`, api 1.0.4, last updated 2026-05-13, 307 features). The UI shows source, coverage and date. Results: Supported / Partial / Unsupported / Requires testing (no data).
- `links.ts` – server route checks http(s) links & images with SSRF protection (private IPs blocked), timeouts and rate limits.
- `qa.ts` – combines everything into a QA report (HTML validation, CSS compatibility, responsiveness, accessibility, images, links, AI analysis, outstanding issues, suggestions), persisted to `analysis_reports`, downloadable as HTML/JSON/Markdown.

**AI (server-side only):** `/api/ai/analyze` and `/api/ai/assist` call the Anthropic API with `ANTHROPIC_API_KEY` (never sent to the browser). Defaults: `claude-opus-5-5` for analysis/fixes, `claude-sonnet-5-5` for chat (env-configurable). Output is schema-constrained JSON: issues, and fixes as exact `find → replace` patches against the current source. The client shows each patch in a diff; nothing is written to the editor without the user approving it, and AI applies create a version so they can be undone. Requests are authenticated, size-limited and rate-limited (Postgres-backed counter, works on serverless).

**SFMC toolkit:** AMPscript/SSJS highlighting, snippet library, personalization strings, sample subscriber data with a *substitution preview* (only `%%Attr%%` strings and simple `AttributeValue` lookups are substituted and it is labelled as such; AMPscript is never claimed to execute). AMPscript lint warnings (unbalanced `%%[ ]%%` blocks, unknown functions, missing `@` variables, etc.). `SfmcProvider` interface documented for future Content Builder / preview API integration.

## 2. Folder structure

```
mailcraft/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, signup, forgot-password
│  │  ├─ auth/callback/route.ts, auth/confirm/route.ts
│  │  ├─ (app)/layout.tsx              # sidebar shell, auth-gated
│  │  │  ├─ dashboard/
│  │  │  ├─ projects/ , projects/[id]/history
│  │  │  ├─ studio/[projectId]/         # editor + preview + analysis + AI
│  │  │  ├─ templates/ , templates/[id]
│  │  │  ├─ components/
│  │  │  ├─ compatibility/
│  │  │  ├─ sfmc/
│  │  │  ├─ reports/ , reports/[id]
│  │  │  └─ settings/
│  │  └─ api/ai/analyze, api/ai/assist, api/links/check, api/reports/[id]/download
│  ├─ components/ui (shadcn) · layout · dashboard · editor · preview · analysis · ai · templates · sfmc
│  ├─ lib/
│  │  ├─ supabase/ (client, server, proxy)
│  │  ├─ email/ (parse, sanitize, validate, compat, qa, format)
│  │  ├─ ai/ (anthropic client, prompts, schemas)
│  │  ├─ rendering/providers (preview + future Litmus/EoA)
│  │  ├─ sfmc/ (ampscript language, lint, snippets)
│  │  ├─ actions/ (server actions: projects, versions, templates, reports, prefs)
│  │  └─ rate-limit.ts, validation.ts (zod)
│  ├─ data/caniemail.json, seed templates & components
│  └─ proxy.ts
├─ supabase/migrations/*.sql, supabase/seed.sql
├─ tests/ (vitest unit) · e2e/ (Playwright)
└─ README.md, docs/
```

## 3. Database schema (Supabase / Postgres)

| Table | Key columns | RLS |
|---|---|---|
| `profiles` | `id` (= auth.users.id), display_name, avatar_url | owner select/update; row created by trigger on signup |
| `user_preferences` | user_id PK, theme, editor_font_size, word_wrap, default_viewport, ai_model | owner all |
| `projects` | id, user_id, name, description, html, subject, preheader, tags, last_opened_at, timestamps | owner all |
| `email_versions` | id, project_id, user_id, version_number, html, message, source (`manual`/`autosave`/`ai`/`restore`/`upload`/`template`), size_bytes | owner select/insert; immutable (no update) ; project must belong to user |
| `template_categories` | id, slug, name, description, sort_order | read for all authenticated; seeded |
| `email_templates` | id, user_id (NULL = system/demo), category_id, name, description, html, tags, is_system | system rows readable by all; own rows full access |
| `saved_components` | id, user_id (NULL = system), kind, name, description, html, tags | same pattern as templates |
| `analysis_reports` | id, user_id, project_id, kind (`validation`/`compatibility`/`ai`/`qa`), score, counts (jsonb), issues (jsonb), summary, html_hash, model | owner all |
| `activity_log` | id, user_id, project_id, action, details jsonb, created_at | owner select/insert |
| `api_rate_limits` | user_id, bucket, window_start, count | no direct access; `consume_rate_limit()` SECURITY DEFINER function |

Indexes on (user_id, updated_at), (project_id, version_number) unique. `updated_at` triggers. All policies use `(select auth.uid())`.

## 4. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | anon/publishable key (RLS enforced) |
| `ANTHROPIC_API_KEY` | server only | Claude API |
| `ANTHROPIC_MODEL_ANALYZE` | server (optional) | default `claude-opus-5-5` |
| `ANTHROPIC_MODEL_ASSIST` | server (optional) | default `claude-sonnet-5-5` |
| `NEXT_PUBLIC_SITE_URL` | client+server | auth redirect URLs |
| `AI_RATE_LIMIT_PER_HOUR`, `LINK_CHECK_RATE_LIMIT_PER_HOUR`, `ANALYZE_RATE_LIMIT_PER_HOUR`, `PROJECT_CREATE_RATE_LIMIT_PER_HOUR`, `REPORT_RATE_LIMIT_PER_HOUR`, `LIBRARY_WRITE_RATE_LIMIT_PER_HOUR` | server (optional) | per-user hourly request limits |
| future: `LITMUS_API_KEY`, `EMAILONACID_API_KEY`, `SFMC_CLIENT_ID/SECRET/SUBDOMAIN` | server | integrations |

## 5. Phase plan

All six phases are implemented. Deployment steps are in `docs/DEPLOYMENT.md`.

1. **Foundation** – Next.js app, Tailwind/shadcn design system, dark/light themes, collapsible sidebar shell, Supabase auth (sign up / in / out / reset), proxy session refresh, migrations + RLS + seed, dashboard with real counts from the DB and empty states.
2. **Code Studio** – Monaco editor, new/upload (click + drag-drop, type & size validated)/paste, format, find/replace, save + autosave versions, download, copy, split-screen live sandboxed preview.
3. **Analysis** – validator, Can I Email compatibility checker (page + in-studio panel), responsive/client/dark-mode simulation, link/image checks, QA report generation, persistence and download.
4. **AI** – analyze route (structured issues with severity filters), AI Fix + assistant chat with patch review, diff compare, apply one/all, undo; rate limits.
5. **Libraries** – template library with seeded demo templates across 11 categories, save-as-template, clone/edit; component library with insert-at-cursor & customization; SFMC toolkit.
6. **Management & hardening** – projects CRUD (rename/duplicate/delete), version compare/restore, history, unit + e2e tests, security headers/CSP, README, Vercel deployment guide.
