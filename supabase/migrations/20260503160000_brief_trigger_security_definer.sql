-- ════════════════════════════════════════════════════════════════════════════
-- Hotfix: snapshot_brief_on_approval trigger must run SECURITY DEFINER
-- ════════════════════════════════════════════════════════════════════════════
-- Without SECURITY DEFINER, the trigger runs as the calling user, which is
-- subject to RLS on brief_revisions. The brief_revisions_org_select policy
-- only allows SELECT — INSERTs from a regular session were blocked, surfacing
-- as "new row violates row-level security policy" on every Approve click.
--
-- SECURITY DEFINER + an explicit search_path = public makes the trigger run
-- as the function owner (postgres) and bypasses RLS, which is the right
-- behaviour for a system audit table.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION snapshot_brief_on_approval() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_rev INTEGER;
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO next_rev
      FROM brief_revisions WHERE brief_id = NEW.id;
    INSERT INTO brief_revisions (
      brief_id, video_id, course_id, org_id,
      talking_points, visual_cues, key_takeaways, script_outline,
      approved_by, approved_at, revision_number
    ) VALUES (
      NEW.id, NEW.video_id, NEW.course_id, NEW.org_id,
      NEW.talking_points, NEW.visual_cues, NEW.key_takeaways, NEW.script_outline,
      NEW.approved_by, COALESCE(NEW.approved_at, NOW()), next_rev
    );
  END IF;
  RETURN NEW;
END
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- UX upgrade: coach-controlled slide count + estimated minutes on briefs
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE content_briefs
  ADD COLUMN IF NOT EXISTS coach_slide_count INTEGER,
  ADD COLUMN IF NOT EXISTS coach_estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_duration TEXT;

ALTER TABLE content_briefs
  ADD CONSTRAINT content_briefs_slide_count_range
    CHECK (coach_slide_count IS NULL OR (coach_slide_count BETWEEN 1 AND 60));

ALTER TABLE content_briefs
  ADD CONSTRAINT content_briefs_estimated_minutes_range
    CHECK (coach_estimated_minutes IS NULL OR (coach_estimated_minutes BETWEEN 1 AND 180));
