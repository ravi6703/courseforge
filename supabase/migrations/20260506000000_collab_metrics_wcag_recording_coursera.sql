-- ════════════════════════════════════════════════════════════════════════════
-- Course collaborators · KPI snapshots · WCAG findings · recording chunks ·
-- Coursera publish history
-- ════════════════════════════════════════════════════════════════════════════
-- One coordinated migration for the next product round. All tables follow
-- the same RLS pattern: org_id scoped via current_user_org_id().

-- ── 1. course_collaborators ────────────────────────────────────────────────
-- Per-course access on top of org scoping. The org owns the course; this
-- table grants additional users an explicit role on a single course.
-- Scenarios: PM invites a freelance coach to one course only; coach asks a
-- reviewer to look at the final deck; etc.
CREATE TABLE IF NOT EXISTS course_collaborators (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL,
  course_id    UUID NOT NULL,
  user_id      UUID,                  -- nullable until the invite is accepted
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('editor','reviewer','viewer')),
  invited_by   UUID,
  invite_token TEXT UNIQUE,
  invited_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at  TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_collab_org    FOREIGN KEY (org_id)    REFERENCES orgs(id)    ON DELETE CASCADE,
  CONSTRAINT fk_collab_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (course_id, email)
);

CREATE INDEX IF NOT EXISTS idx_collab_course ON course_collaborators(course_id);
CREATE INDEX IF NOT EXISTS idx_collab_user   ON course_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_token  ON course_collaborators(invite_token);

ALTER TABLE course_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_collaborators_org_select ON course_collaborators;
DROP POLICY IF EXISTS course_collaborators_org_write  ON course_collaborators;
CREATE POLICY course_collaborators_org_select ON course_collaborators FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY course_collaborators_org_write ON course_collaborators FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ── 2. metrics_snapshots ────────────────────────────────────────────────────
-- Daily KPI snapshots so the dashboard can show real prior-period deltas
-- instead of placeholder strings. Recorder runs from /api/admin/snapshot
-- (called manually today; can be wired to Vercel cron later).
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL,
  recorded_on        DATE NOT NULL DEFAULT CURRENT_DATE,
  courses_total      INTEGER NOT NULL DEFAULT 0,
  courses_in_prod    INTEGER NOT NULL DEFAULT 0,
  courses_published  INTEGER NOT NULL DEFAULT 0,
  briefs_approved    INTEGER NOT NULL DEFAULT 0,
  videos_recorded    INTEGER NOT NULL DEFAULT 0,
  health_score_avg   NUMERIC(5,2) NOT NULL DEFAULT 0,
  reviews_pending    INTEGER NOT NULL DEFAULT 0,
  details            JSONB DEFAULT '{}',
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_snap_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  UNIQUE (org_id, recorded_on)
);

CREATE INDEX IF NOT EXISTS idx_snap_org_date ON metrics_snapshots(org_id, recorded_on DESC);

ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metrics_snapshots_org_select ON metrics_snapshots;
DROP POLICY IF EXISTS metrics_snapshots_org_write  ON metrics_snapshots;
CREATE POLICY metrics_snapshots_org_select ON metrics_snapshots FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY metrics_snapshots_org_write ON metrics_snapshots FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ── 3. wcag_findings ────────────────────────────────────────────────────────
-- Per-course accessibility lint cache. Soft-warns in Final Review;
-- doesn't block publish today.
CREATE TABLE IF NOT EXISTS wcag_findings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  course_id   UUID NOT NULL,
  scope       TEXT NOT NULL,           -- 'reading' | 'slide' | 'transcript' | 'video' | 'course'
  scope_id    UUID,                    -- the specific artifact id when applicable
  rule_id     TEXT NOT NULL,           -- e.g. 'image_alt_missing', 'contrast_low'
  level       TEXT NOT NULL CHECK (level IN ('A','AA','AAA')),
  severity    TEXT NOT NULL CHECK (severity IN ('error','warning','info')),
  message     TEXT NOT NULL,
  fix_hint    TEXT,
  details     JSONB DEFAULT '{}',
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wcag_org    FOREIGN KEY (org_id)    REFERENCES orgs(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wcag_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wcag_course ON wcag_findings(course_id);

ALTER TABLE wcag_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wcag_findings_org_select ON wcag_findings;
DROP POLICY IF EXISTS wcag_findings_org_write  ON wcag_findings;
CREATE POLICY wcag_findings_org_select ON wcag_findings FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY wcag_findings_org_write ON wcag_findings FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ── 4. recording_chunks ─────────────────────────────────────────────────────
-- Partial-segment re-record. Each chunk is its own Storage object; the
-- recording row's audio_url becomes a play-list manifest pointing at this
-- table's rows in order. ffmpeg concat is deferred — players (Coursera /
-- our internal viewer) play chunks sequentially via the manifest.
CREATE TABLE IF NOT EXISTS recording_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  course_id       UUID NOT NULL,
  recording_id    UUID NOT NULL,
  chunk_order     INTEGER NOT NULL,
  audio_url       TEXT NOT NULL,
  storage_path    TEXT,
  duration_seconds NUMERIC(10,3),
  is_replacement  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chunk_org       FOREIGN KEY (org_id)       REFERENCES orgs(id)       ON DELETE CASCADE,
  CONSTRAINT fk_chunk_course    FOREIGN KEY (course_id)    REFERENCES courses(id)    ON DELETE CASCADE,
  CONSTRAINT fk_chunk_recording FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  UNIQUE (recording_id, chunk_order)
);

CREATE INDEX IF NOT EXISTS idx_chunk_recording ON recording_chunks(recording_id, chunk_order);

ALTER TABLE recording_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recording_chunks_org_select ON recording_chunks;
DROP POLICY IF EXISTS recording_chunks_org_write  ON recording_chunks;
CREATE POLICY recording_chunks_org_select ON recording_chunks FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY recording_chunks_org_write ON recording_chunks FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ── 5. coursera_publishes ──────────────────────────────────────────────────
-- History of Coursera zip exports. We record what was packaged and when so
-- subsequent rebuilds can incremental-diff in the future.
CREATE TABLE IF NOT EXISTS coursera_publishes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL,
  course_id    UUID NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('packaging','ready','error','uploaded')),
  zip_url      TEXT,
  manifest     JSONB DEFAULT '{}',
  error        TEXT,
  created_by   UUID,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_publishes_org    FOREIGN KEY (org_id)    REFERENCES orgs(id)    ON DELETE CASCADE,
  CONSTRAINT fk_publishes_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coursera_course ON coursera_publishes(course_id, created_at DESC);

ALTER TABLE coursera_publishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coursera_publishes_org_select ON coursera_publishes;
DROP POLICY IF EXISTS coursera_publishes_org_write  ON coursera_publishes;
CREATE POLICY coursera_publishes_org_select ON coursera_publishes FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY coursera_publishes_org_write ON coursera_publishes FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ── 6. courses extra columns for onboarding + Coursera ──────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS coursera_course_id TEXT,
  ADD COLUMN IF NOT EXISTS coursera_published_at TIMESTAMP WITH TIME ZONE;

-- Onboarding state lives on auth.users.user_metadata so we don't need a
-- new table; the wizard reads/writes user_metadata.onboarding via
-- supabase.auth.updateUser({ data: { onboarding: {...} } }).
