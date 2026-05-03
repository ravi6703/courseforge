-- ════════════════════════════════════════════════════════════════════════════
-- CourseForge — Migration v5 (briefs per video + approval gating)
-- ════════════════════════════════════════════════════════════════════════════
-- Per the Phase Unit Consistency spec:
--   - 1 brief per VIDEO (was 1 per lesson)
--   - briefs gain status field that gates downstream phases
--
-- Run AFTER 20260503000000_phases_6_7_8.sql
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Drop existing briefs (templated, single user, safe to regenerate)
TRUNCATE content_briefs;

-- 2. Make video_id required and unique. lesson_id stays for context but
--    is no longer the canonical key.
ALTER TABLE content_briefs ALTER COLUMN video_id SET NOT NULL;

-- Drop any old unique constraints on lesson_id if they existed
DROP INDEX IF EXISTS content_briefs_lesson_id_key;

-- One brief per video. UNIQUE INDEX (not constraint) so we can use IF NOT EXISTS.
CREATE UNIQUE INDEX IF NOT EXISTS content_briefs_video_id_unique ON content_briefs(video_id);

-- 3. Replace status with constrained enum-style check.
ALTER TABLE content_briefs DROP CONSTRAINT IF EXISTS content_briefs_status_check;
ALTER TABLE content_briefs
  ALTER COLUMN status SET DEFAULT 'draft',
  ADD CONSTRAINT content_briefs_status_check
    CHECK (status IN ('draft','approved','changes_requested'));

-- 4. Approval audit trail
ALTER TABLE content_briefs
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Helpful index for the PPT Tracker join (videos with approved briefs)
CREATE INDEX IF NOT EXISTS idx_content_briefs_approved
  ON content_briefs(course_id, status)
  WHERE status = 'approved';
