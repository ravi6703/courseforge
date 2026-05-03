-- ════════════════════════════════════════════════════════════════════════════
-- Phase 9 hotfix — content_items FORCE recreate (recovery from prior migration)
-- ════════════════════════════════════════════════════════════════════════════
-- The earlier 20260504020000 migration used DROP TYPE ... CASCADE before
-- conditionally recreating the table. CASCADE drops any column that uses the
-- type, so on databases where the new-shape table already partially existed
-- the migration removed the kind/status columns and then the CREATE INDEX
-- on (kind) failed: 42703 "column 'kind' does not exist".
--
-- This migration recovers cleanly: unconditionally drop the table + types,
-- then recreate the entire v9 shape (table + enum types + indexes + RLS
-- + updated_at trigger). Idempotent. Safe to re-run.
--
-- DESTRUCTIVE: drops content_items entirely. Pilot-safe — no production data
-- path has produced content_items rows because the pipeline never worked
-- end-to-end. If your project somehow has rows in content_items you care
-- about, back them up (SELECT * INTO TEMP backup_ci FROM content_items)
-- before running this.
-- ════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS content_items CASCADE;
DROP TYPE  IF EXISTS content_kind  CASCADE;
DROP TYPE  IF EXISTS content_status CASCADE;

CREATE TYPE content_kind   AS ENUM ('pq', 'gq', 'reading', 'scorm', 'ai_coach');
CREATE TYPE content_status AS ENUM ('draft', 'approved');

CREATE TABLE content_items (
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

CREATE INDEX idx_content_org_id    ON content_items(org_id);
CREATE INDEX idx_content_course_id ON content_items(course_id);
CREATE INDEX idx_content_video_id  ON content_items(video_id);
CREATE INDEX idx_content_kind      ON content_items(kind);
CREATE INDEX idx_content_status    ON content_items(status);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

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
