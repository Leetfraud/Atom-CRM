-- Row-Level Security policies for Exodus CRM
--
-- Context: RLS is enabled on all app tables. Without a matching permissive
-- policy, Postgres denies every read/write by default (that's the
-- "new row violates row-level security policy" error on insert).
--
-- Current stance (intentionally coarse — tighten later): any authenticated
-- user can read and write everything, so the 'sales' and 'exec' app roles
-- have identical database permissions. The app-level role (stored in
-- profiles.role) only gates which pages/nav are shown; it does NOT restrict
-- data access here.
--
-- Run in: Supabase -> SQL Editor.
-- If a policy already exists, uncomment the matching drop line above it.

-- drop policy if exists "authenticated_all_prospects" on prospects;
create policy "authenticated_all_prospects" on prospects
  for all to authenticated using (true) with check (true);

-- drop policy if exists "authenticated_all_email_pipeline" on email_pipeline;
create policy "authenticated_all_email_pipeline" on email_pipeline
  for all to authenticated using (true) with check (true);

-- drop policy if exists "authenticated_all_linkedin_pipeline" on linkedin_pipeline;
create policy "authenticated_all_linkedin_pipeline" on linkedin_pipeline
  for all to authenticated using (true) with check (true);

-- drop policy if exists "authenticated_all_prospect_tags" on prospect_tags;
create policy "authenticated_all_prospect_tags" on prospect_tags
  for all to authenticated using (true) with check (true);

-- drop policy if exists "authenticated_all_prospect_activity_log" on prospect_activity_log;
create policy "authenticated_all_prospect_activity_log" on prospect_activity_log
  for all to authenticated using (true) with check (true);

-- drop policy if exists "authenticated_all_daily_stats" on daily_stats;
create policy "authenticated_all_daily_stats" on daily_stats
  for all to authenticated using (true) with check (true);
