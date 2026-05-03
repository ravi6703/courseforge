-- ════════════════════════════════════════════════════════════════════════════
-- CourseForge — Migration v6 (brief revisions for re-approval workflow)
-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3 R9 — when a brief is approved, snapshot its content. When the
-- coach edits the approved brief (which auto-reverts status to 'draft'),
-- the previous snapshot remains so the PM can compare the new version
-- against what they previously approved before re-approving.
--
-- Run AFTER 20260503120000_briefs_per_video.sql
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brief_revisions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id        UUID NOT NULL REFERENCES content_briefs(id) ON DELETE CASCADE,
  video_id        UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- Snapshot of the brief content at the moment of approval
  talking_points  JSONB,
  visual_cues     JSONB,
  key_takeaways   JSONB,
  script_outline  TEXT,
  -- Audit
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revision_number INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_revisions_brief ON brief_revisions(brief_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_brief_revisions_video ON brief_revisions(video_id, approved_at DESC);

ALTER TABLE brief_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY brief_revisions_org_select ON brief_revisions FOR SELECT
  USING (org_id = current_user_org_id());

-- Trigger: on every brief INSERT/UPDATE where status flips TO 'approved',
-- snapshot the current state into brief_revisions with an incremented
-- revision_number for that brief.
CREATE OR REPLACE FUNCTION snapshot_brief_on_approval() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_rev INTEGER;
BEGIN
  -- Only snapshot when status is being set to 'approved'
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

DROP TRIGGER IF EXISTS trg_snapshot_brief_on_approval ON content_briefs;
CREATE TRIGGER trg_snapshot_brief_on_approval
  AFTER INSERT OR UPDATE OF status ON content_briefs
  FOR EACH ROW EXECUTE FUNCTION snapshot_brief_on_approval();
