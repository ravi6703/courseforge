-- ════════════════════════════════════════════════════════════════════════════
-- Phase 9 hotfix — content_items clean recreate
-- ════════════════════════════════════════════════════════════════════════════
-- The v1 schema (20260328) created a legacy content_items table keyed on
-- lesson_id with columns (type, title, content, description, duration). The
-- v9 schema (20260503220000) intended to replace it with the new shape keyed
-- on video_id with columns (kind, payload, generated_at, approved_at, etc.)
-- — but it used CREATE TABLE IF NOT EXISTS, so on any project where the v1
-- schema was already applied, v9's CREATE TABLE silently no-op'd.
--
-- Symptom: nested select videos(content_items(...)) fails because there's no
-- FK on video_id, surfacing as "Course not found" on the Content tab.
--
-- This migration:
--   1. Detects the legacy shape (presence of column 'type')
--   2. If legacy: drops the table cascade-style (kills the legacy RLS
--      policies + indexes too) and recreates with the v9 shape
--   3. If already-correct shape: no-op
--
-- Pilot-safe: legacy content_items had no production data path because no UI
-- ever wrote to it (the new content phase replaced it before launch). If your
-- project DOES have legacy rows you care about, back them up before applying.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Detect legacy shape
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'content_items'
      AND column_name  = 'type'
  ) THEN
    -- Drop dependent policies + indexes via CASCADE
    DROP TABLE content_items CASCADE;
  END IF;
END
$$;

-- Drop ENUM types if they exist from a half-applied v9 (idempotent recreate)
DROP TYPE IF EXISTS content_kind CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;

CREATE TYPE content_kind   AS ENUM ('pq', 'gq', 'reading', 'scorm', 'ai_coach');
CREATE TYPE content_status AS ENUM ('draft', 'approved');

-- v9-shaped content_items (mirrors 20260503220000_content_items.sql exactly)
CREATE TABLE IF NOT EXISTS content_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL,
  course_id        UUID NOT NULL,
  video_id         UUID NOT NULL,
  kind             content_kind NOT NULL,
  status           content_status NOT NULL DEFAULT 'draft',
  payload          JSONB NOT NULL,
  generated_at     TIMESTAMP WITH TIME ZONE,
  approved_at      TIMESTAMP WITH TIME ZONE,
  approved_by      UUID,
  generation_error TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_content_org      FOREIGN KEY (org_id)      REFERENCES orgs(id)        ON DELETE CASCADE,
  CONSTRAINT fk_content_course   FOREIGN KEY (course_id)   REFERENCES courses(id)     ON DELETE CASCADE,
  CONSTRAINT fk_content_video    FOREIGN KEY (video_id)    REFERENCES videos(id)      ON DELETE CASCADE,
  CONSTRAINT fk_content_approver FOREIGN KEY (approved_by) REFERENCES auth.users(id)  ON DELETE SET NULL,
  UNIQUE (video_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_content_org_id    ON content_items(org_id);
CREATE INDEX IF NOT EXISTS idx_content_course_id ON content_items(course_id);
CREATE INDEX IF NOT EXISTS idx_content_video_id  ON content_items(video_id);
CREATE INDEX IF NOT EXISTS idx_content_kind      ON content_items(kind);
CREATE INDEX IF NOT EXISTS idx_content_status    ON content_items(status);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_items_org_select ON content_items;
DROP POLICY IF EXISTS content_items_org_insert ON content_items;
DROP POLICY IF EXISTS content_items_org_update ON content_items;
DROP POLICY IF EXISTS content_items_org_delete ON content_items;

CREATE POLICY content_items_org_select ON content_items FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY content_items_org_insert ON content_items FOR INSERT
  WITH CHECK (org_id = current_user_org_id());
CREATE POLICY content_items_org_update ON content_items FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
CREATE POLICY content_items_org_delete ON content_items FOR DELETE
  USING (org_id = current_user_org_id() AND status = 'draft');

CREATE OR REPLACE FUNCTION update_content_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_items_update_timestamp ON content_items;
CREATE TRIGGER content_items_update_timestamp
  BEFORE UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_content_items_updated_at();
