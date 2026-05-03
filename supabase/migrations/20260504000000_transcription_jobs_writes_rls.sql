-- ════════════════════════════════════════════════════════════════════════════
-- Phase 4 hotfix — transcription_jobs RLS write policies
-- ════════════════════════════════════════════════════════════════════════════
-- v3 (phases_6_7_8) enabled RLS on transcription_jobs but only added a SELECT
-- policy. INSERT/UPDATE from the user-bound supabase client (which is what
-- /api/transcribe uses to create the job row) was therefore silently denied,
-- producing a 500 "could not create job" and blocking every transcription.
--
-- This migration adds the missing INSERT/UPDATE/DELETE policies, scoped to
-- the caller's org just like the other content tables. SELECT policy is left
-- untouched (it already exists).
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY transcription_jobs_org_insert ON transcription_jobs
  FOR INSERT WITH CHECK (org_id = current_user_org_id());

CREATE POLICY transcription_jobs_org_update ON transcription_jobs
  FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

CREATE POLICY transcription_jobs_org_delete ON transcription_jobs
  FOR DELETE
  USING (org_id = current_user_org_id() AND current_user_role() = 'pm');
