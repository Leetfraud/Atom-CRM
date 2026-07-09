# Atom CRM

A lightweight internal CRM for tracking outbound sales prospects across email and LinkedIn pipelines.

## Stack

- React + Vite
- Tailwind CSS
- React Router
- Supabase (Postgres + Auth) as the backend

## Features

- **Auth** — email/password login and self-service registration (`sales` or `exec` role), backed by Supabase Auth.
- **Prospects** — add, edit, filter, and search prospects; track them through separate email and LinkedIn pipelines (stage, connection status, DM status, replies, etc.).
- **Prospect detail card** — a right-side panel per prospect with links, pipeline controls, tags, and a per-channel activity log (notes + actions). A left-side panel mirrors the prospect's general notes and note history for quick reference while the card is open.
- **Import** — bulk CSV import of prospects with a review step before committing.
- **Analytics / Daily Log** — exec-only views of pipeline stats and daily activity trends.
- **Team chat** — a simple shared chat panel accessible from the topbar.

Page access is role-gated: `sales` sees the Prospects page; `exec` additionally sees Analytics, Daily Log, and Import (see `src/components/layout/Sidebar.jsx` and `src/App.jsx`).

## Getting started

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run preview`.

### Environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase setup

The database schema (tables like `prospects`, `email_pipeline`, `linkedin_pipeline`, `prospect_tags`, `prospect_activity_log`, `daily_stats`, `profiles`) is managed directly in the Supabase project. Row-level security policies for these tables are defined in `supabase/policies.sql` — run that file in the Supabase SQL editor when setting up a new project or after policy changes.

For registration to work end-to-end, also configure email delivery under Authentication → Settings (the Supabase default sender has a low rate limit, so custom SMTP is recommended for real usage).

## Project structure

```
src/
  pages/         Route-level views (Login, Register, SalesDashboard, Analytics, DailyLog, Import)
  components/    UI grouped by feature (prospects, import, analytics, chat, layout, ui)
  context/       Auth and sidebar-collapse state
  hooks/         Data-fetching hooks per Supabase table/feature
  utils/         Shared constants, formatting, and CSV import parsers
  lib/           Supabase client setup
supabase/
  policies.sql   Row-level security policies
```
