-- ════════════════════════════════════════════════════════════════════════════
-- v4 — best-features push
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the schema surface for the May-2026 best-features push:
--   1. profile_templates                  (Profile · starter templates)
--   2. coach_capacity                      (Timeline · per-coach hrs/week)
--   3. brief_variants                      (Briefs · A/B variants)
--   4. lesson_lint_results                 (Briefs / Content · lint)
--   5. glossary_entries                    (Transcript · auto-glossary)
--   6. generation_jobs                     (Cross-cutting · background queue)
--   7. copilot_sessions, copilot_messages  (Cross-cutting · AI chat)
--   8. ppt_slides.order_index              (Slides · drag-reorder)
--   9. recordings.smart_cuts               (Recording · cut markers)
--  10. preflight_scorecards                (Publish · scorecard)
--  11. multi_target_exports                (Publish · multi-target export)

-- 1. Profile templates
CREATE TABLE IF NOT EXISTS profile_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL,
  description TEXT,
  profile JSONB NOT NULL,
  source_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  health_score NUMERIC(4,2),
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_templates_org ON profile_templates(org_id, created_at DESC);

ALTER TABLE profile_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pt_select ON profile_templates;
CREATE POLICY pt_select ON profile_templates FOR SELECT
  USING (is_global OR org_id = current_user_org_id());

-- 2. Coach capacity (cross-course)
CREATE TABLE IF NOT EXISTS coach_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours_per_week INTEGER NOT NULL DEFAULT 20,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id, effective_from)
);

ALTER TABLE coach_capacity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cc_org_all ON coach_capacity;
CREATE POLICY cc_org_all ON coach_capacity FOR ALL
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- 3. Brief A/B variants
CREATE TABLE IF NOT EXISTS brief_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,         -- 'A' | 'B' | 'C'
  variant_format TEXT NOT NULL,        -- 'example_driven' | 'problem_solution' | …
  payload JSONB NOT NULL,              -- same shape as content_briefs
  picked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brief_variants_video ON brief_variants(video_id);

ALTER TABLE brief_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bv_org_all ON brief_variants;
CREATE POLICY bv_org_all ON brief_variants FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));

-- 4. Lesson lint results
CREATE TABLE IF NOT EXISTS lesson_lint_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('brief','content','consistency')),
  severity TEXT NOT NULL CHECK (severity IN ('info','warn','error')),
  rule_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lesson_lint_lesson ON lesson_lint_results(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_lint_course_unresolved ON lesson_lint_results(course_id) WHERE resolved_at IS NULL;

ALTER TABLE lesson_lint_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS llr_org_all ON lesson_lint_results;
CREATE POLICY llr_org_all ON lesson_lint_results FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));

-- 5. Glossary entries
CREATE TABLE IF NOT EXISTS glossary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
  source_transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL,
  promoted_to_profile BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, term)
);

ALTER TABLE glossary_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ge_org_all ON glossary_entries;
CREATE POLICY ge_org_all ON glossary_entries FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));

-- 6. Generation jobs (background queue)
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error','cancelled')),
  result JSONB,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gen_jobs_course_status ON generation_jobs(course_id, status, created_at DESC);

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gj_org_all ON generation_jobs;
CREATE POLICY gj_org_all ON generation_jobs FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));

-- 7. Co-pilot sessions / messages
CREATE TABLE IF NOT EXISTS copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_course ON copilot_sessions(course_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  context_refs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_session ON copilot_messages(session_id, created_at);

ALTER TABLE copilot_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cs_org_all ON copilot_sessions;
CREATE POLICY cs_org_all ON copilot_sessions FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));

ALTER TABLE copilot_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cm_org_all ON copilot_messages;
CREATE POLICY cm_org_all ON copilot_messages FOR ALL
  USING (session_id IN (SELECT id FROM copilot_sessions WHERE course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id())))
  WITH CHECK (session_id IN (SELECT id FROM copilot_sessions WHERE course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id())));

-- 8. Slides drag-reorder index
ALTER TABLE ppt_slides ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- 9. Recording smart-cut markers
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS smart_cuts JSONB DEFAULT '[]'::jsonb;

-- 10. Preflight scorecards
CREATE TABLE IF NOT EXISTS preflight_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE UNIQUE,
  overall_score INTEGER NOT NULL DEFAULT 0,
  wcag_score INTEGER NOT NULL DEFAULT 0,
  completeness_score INTEGER NOT NULL DEFAULT 0,
  brand_score INTEGER NOT NULL DEFAULT 0,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE preflight_scorecards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ps_org_all ON preflight_scorecards;
CREATE POLICY ps_org_all ON preflight_scorecards FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));

-- 11. Multi-target exports
CREATE TABLE IF NOT EXISTS multi_target_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  target TEXT NOT NULL CHECK (target IN ('scorm12','scorm2004','coursera','xapi','mp4','landing_md','linkedin_post')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  artifact_url TEXT,
  size_bytes BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mte_course ON multi_target_exports(course_id, created_at DESC);

ALTER TABLE multi_target_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mte_org_all ON multi_target_exports;
CREATE POLICY mte_org_all ON multi_target_exports FOR ALL
  USING (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id()));
