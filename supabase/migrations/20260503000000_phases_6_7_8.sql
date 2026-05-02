-- ════════════════════════════════════════════════════════════════════════════
-- CourseForge — Migration v4 (PPT upload, transcription, Zoom integration)
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the storage + state tracking for the three pipelines that the audit
-- flagged as "missing" in Phases 6, 7, and 8a.
--
-- Run AFTER 20260502000000_rate_limit.sql
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ════════════════════════════════════════════════════════════════════════════
-- Two private buckets, written by the service role and read via signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ppt-uploads', 'ppt-uploads', false, 52428800,  -- 50 MB max
   ARRAY['application/vnd.openxmlformats-officedocument.presentationml.presentation','application/pdf']),
  ('recordings',  'recordings',  false, 524288000, -- 500 MB max
   ARRAY['audio/mpeg','audio/mp4','audio/m4a','audio/wav','video/mp4','video/quicktime','video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can read objects scoped to their org. Path
-- convention: <bucket>/<org_id>/<course_id>/<file>. The service role
-- (used by the upload route) bypasses these.
DROP POLICY IF EXISTS "ppt_org_select" ON storage.objects;
CREATE POLICY "ppt_org_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ppt-uploads'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );
DROP POLICY IF EXISTS "rec_org_select" ON storage.objects;
CREATE POLICY "rec_org_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

-- ════════════════════════════════════════════════════════════════════════════
-- PPT UPLOADS — extend with parsed-text storage
-- ════════════════════════════════════════════════════════════════════════════
-- ppt_uploads already exists from migration v2; add slide_text JSONB so the
-- parser can store extracted text per slide without re-parsing on every read.
ALTER TABLE ppt_uploads
  ADD COLUMN IF NOT EXISTS slide_text JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS parse_error TEXT,
  ADD COLUMN IF NOT EXISTS rewrite_status TEXT DEFAULT 'idle' CHECK (rewrite_status IN ('idle','running','complete','error')),
  ADD COLUMN IF NOT EXISTS rewrite_error TEXT;

-- ════════════════════════════════════════════════════════════════════════════
-- TRANSCRIPTION JOBS
-- ════════════════════════════════════════════════════════════════════════════
-- Tracks the async-ish lifecycle of a Whisper call. Even if we run it
-- inline today, having job state means we can move to a queue worker later
-- without changing the API surface.
CREATE TABLE IF NOT EXISTS transcription_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  recording_id    UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','complete','error')),
  provider        TEXT NOT NULL DEFAULT 'openai' CHECK (provider IN ('openai','replicate','azure')),
  duration_seconds INTEGER,
  error           TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_recording ON transcription_jobs(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_org_status ON transcription_jobs(org_id, status, created_at DESC);

ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY transcription_jobs_org_select ON transcription_jobs FOR SELECT
  USING (org_id = current_user_org_id());

-- ════════════════════════════════════════════════════════════════════════════
-- ZOOM OAUTH CREDENTIALS
-- ════════════════════════════════════════════════════════════════════════════
-- One row per (org, zoom_user). access_token + refresh_token stored
-- encrypted via pgcrypto if you set the SUPABASE_VAULT_KEY in env;
-- otherwise plaintext (fine for pilot). Rotate by deleting + re-authing.
CREATE TABLE IF NOT EXISTS zoom_credentials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  zoom_user_id    TEXT NOT NULL,
  zoom_account_id TEXT,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  scopes          TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, zoom_user_id)
);
CREATE INDEX IF NOT EXISTS idx_zoom_credentials_org ON zoom_credentials(org_id);

ALTER TABLE zoom_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY zoom_credentials_org_select ON zoom_credentials FOR SELECT
  USING (org_id = current_user_org_id());

-- bump_updated_at trigger (function already defined in migration v2)
DROP TRIGGER IF EXISTS trg_bump_zoom_credentials ON zoom_credentials;
CREATE TRIGGER trg_bump_zoom_credentials BEFORE UPDATE ON zoom_credentials
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- ZOOM RECORDING WEBHOOK EVENTS (idempotency log)
-- ════════════════════════════════════════════════════════════════════════════
-- Zoom retries webhooks on 5xx. We dedupe by event id so duplicate
-- 'recording.completed' deliveries don't re-import the same MP4.
CREATE TABLE IF NOT EXISTS zoom_webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zoom_event_id   TEXT UNIQUE NOT NULL,
  zoom_event_type TEXT NOT NULL,
  account_id      TEXT,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zoom_webhook_events_unprocessed ON zoom_webhook_events(processed_at)
  WHERE processed_at IS NULL;

-- No RLS — internal table, only service role writes.
ALTER TABLE zoom_webhook_events ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- RECORDINGS — allow unassigned recordings (Zoom inbox flow)
-- ════════════════════════════════════════════════════════════════════════════
-- The Zoom webhook drops recordings into a per-org inbox before the PM
-- links them to a course/lesson/video. So course_id, lesson_id, video_id
-- need to allow NULL on the recordings table. They were NOT NULL in the
-- original schema. We backfill PM associations via the recording dashboard.
ALTER TABLE recordings
  ALTER COLUMN course_id DROP NOT NULL,
  ALTER COLUMN lesson_id DROP NOT NULL,
  ALTER COLUMN video_id  DROP NOT NULL;

-- Backfill org_id on existing rows (defensive — they should already have it).
UPDATE recordings r SET org_id = c.org_id
  FROM courses c WHERE r.course_id = c.id AND r.org_id IS NULL;

-- A linking endpoint will set these when PM associates an inbox recording.
