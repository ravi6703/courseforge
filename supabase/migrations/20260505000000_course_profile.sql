-- ════════════════════════════════════════════════════════════════════════════
-- Course Profile — the missing brain
-- ════════════════════════════════════════════════════════════════════════════
-- A single jsonb column that captures the coach's intent ONCE and is read by
-- every AI prompt builder downstream (TOC, briefs, PPT, transcript cleanup,
-- content, AI Coach). Replaces the pattern of every stage starting from zero.
--
-- Stored shape — see src/types/course-profile.ts for the canonical TS type.
-- The default is intentionally minimal so existing courses keep working;
-- anything missing is filled in by getProfile() at read time.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}';

-- A timestamp so downstream artifacts can detect when the profile changes
-- and mark themselves stale (used by the artifact_provenance table in a
-- future migration).
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Whenever profile changes, bump profile_updated_at automatically.
CREATE OR REPLACE FUNCTION bump_course_profile_updated_at() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile IS DISTINCT FROM OLD.profile THEN
    NEW.profile_updated_at = NOW();
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_course_profile ON courses;
CREATE TRIGGER trg_bump_course_profile
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION bump_course_profile_updated_at();
