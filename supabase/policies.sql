-- Row-Level Security policies for Atom CRM
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

-- profiles is scoped to the owning row (not the coarse "authenticated_all"
-- stance above) because profiles.role gates page access via ProtectedRoute.
-- Self-registration (Register.jsx) inserts a row with id = auth.uid(), and
-- AuthContext reads it back on login.

-- drop policy if exists "self_select_profiles" on profiles;
create policy "self_select_profiles" on profiles
  for select to authenticated using (auth.uid() = id);

-- drop policy if exists "self_insert_profiles" on profiles;
create policy "self_insert_profiles" on profiles
  for insert to authenticated with check (auth.uid() = id);

-- drop policy if exists "self_update_profiles" on profiles;
create policy "self_update_profiles" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
