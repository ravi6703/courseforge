-- ════════════════════════════════════════════════════════════════════════════
-- AI Edit revisions + extended content_kind + lint findings cache
-- ════════════════════════════════════════════════════════════════════════════
-- Three additions:
--
-- 1. artifact_revisions — every accepted AI Edit lands here with the prompt,
--    the diff (text), the previous payload, and the next payload. A revert is
--    just "load row N's payload_before back into content_items".
--
-- 2. content_kind enum — add 'discussion' and 'worked_example' so the new
--    artifact previews + lint endpoints can target these kinds.
--
-- 3. lint_findings — cached per-artifact lint output keyed on (content_item_id,
--    rule_id). Lets the suggestions rail show a stable list without re-running
--    the whole lint on every render.

-- ── 1. artifact_revisions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artifact_revisions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL,
  course_id        UUID NOT NULL,
  content_item_id  UUID NOT NULL,
  author_id        UUID,
  prompt           TEXT NOT NULL,
  diff_text        TEXT,
  payload_before   JSONB NOT NULL,
  payload_after    JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'accepted', -- 'accepted' | 'rejected' | 'reverted'
  ai_provider      TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_rev_org    FOREIGN KEY (org_id)          REFERENCES orgs(id)          ON DELETE CASCADE,
  CONSTRAINT fk_rev_course FOREIGN KEY (course_id)       REFERENCES courses(id)       ON DELETE CASCADE,
  CONSTRAINT fk_rev_item   FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artifact_revisions_item    ON artifact_revisions(content_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifact_revisions_course  ON artifact_revisions(course_id);

ALTER TABLE artifact_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS artifact_revisions_org_select ON artifact_revisions;
DROP POLICY IF EXISTS artifact_revisions_org_insert ON artifact_revisions;
DROP POLICY IF EXISTS artifact_revisions_org_update ON artifact_revisions;
CREATE POLICY artifact_revisions_org_select ON artifact_revisions FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY artifact_revisions_org_insert ON artifact_revisions FOR INSERT
  WITH CHECK (org_id = current_user_org_id());
CREATE POLICY artifact_revisions_org_update ON artifact_revisions FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ── 2. content_kind enum: add discussion + worked_example ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'discussion'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_kind')) THEN
    ALTER TYPE content_kind ADD VALUE 'discussion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'worked_example'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_kind')) THEN
    ALTER TYPE content_kind ADD VALUE 'worked_example';
  END IF;
END
$$;

-- ── 3. lint_findings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lint_findings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL,
  course_id        UUID NOT NULL,
  content_item_id  UUID,                    -- nullable: course-level findings (audit)
  scope            TEXT NOT NULL,           -- 'pq' | 'gq' | 'reading' | 'deck' | 'transcript' | 'course'
  rule_id          TEXT NOT NULL,           -- e.g. 'objective_coverage', 'reading_level_drift'
  severity         TEXT NOT NULL,           -- 'critical' | 'major' | 'minor'
  message          TEXT NOT NULL,
  fix_prompt       TEXT,                    -- preferred prompt for one-click apply
  details          JSONB DEFAULT '{}',
  resolved         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_lint_org    FOREIGN KEY (org_id)          REFERENCES orgs(id)          ON DELETE CASCADE,
  CONSTRAINT fk_lint_course FOREIGN KEY (course_id)       REFERENCES courses(id)       ON DELETE CASCADE,
  CONSTRAINT fk_lint_item   FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lint_findings_item   ON lint_findings(content_item_id);
CREATE INDEX IF NOT EXISTS idx_lint_findings_course ON lint_findings(course_id, scope);

ALTER TABLE lint_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lint_findings_org_select ON lint_findings;
DROP POLICY IF EXISTS lint_findings_org_write  ON lint_findings;
CREATE POLICY lint_findings_org_select ON lint_findings FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY lint_findings_org_write ON lint_findings FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
