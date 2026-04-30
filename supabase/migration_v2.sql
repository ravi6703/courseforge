-- ════════════════════════════════════════════════════════════════════════════
-- CourseForge — Migration v2
-- ════════════════════════════════════════════════════════════════════════════
-- Goals vs migration v1:
--   1. Multi-tenant: every business object scoped to an `org_id`
--   2. Real RLS: replace open `USING (true)` policies with role-based access
--   3. Reconcile schema with TypeScript types (add missing tables / columns)
--   4. First-class assessments / questions / question_attempts
--   5. Generic comments table (TOC was a special case; everything is commentable)
--   6. Activity log + notifications for the PM dashboard
--   7. Course-level fields the PRD requires (hours_per_week, domain, prerequisites,
--      target_job_roles, theory_handson_ratio, project_based, capstone, etc.)
--
-- Run in Supabase SQL Editor. Designed to be applied AFTER migration v1; uses
-- IF NOT EXISTS / DO blocks so it's idempotent.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS (multi-tenant root)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_kit JSONB DEFAULT '{}',
  default_platform TEXT DEFAULT 'infylearn',
  ai_provider TEXT DEFAULT 'anthropic' CHECK (ai_provider IN ('anthropic','openai','azure','bedrock')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO orgs (id, name, slug)
VALUES ('00000000-0000-0000-0000-0000000000aa', 'Board Infinity', 'board-infinity')
ON CONFLICT (slug) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- PROFILES — extend with org_id, ties to auth.users
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE; -- maps to auth.users.id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

UPDATE profiles SET org_id = '00000000-0000-0000-0000-0000000000aa' WHERE org_id IS NULL;
ALTER TABLE profiles ALTER COLUMN org_id SET NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- COURSES — add missing PRD fields
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE courses ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hours_per_week INTEGER DEFAULT 6;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_job_roles JSONB DEFAULT '[]';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certification_goal TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS theory_handson_ratio INTEGER DEFAULT 70 CHECK (theory_handson_ratio BETWEEN 0 AND 100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS project_based BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS capstone BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reference_course_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS module_hours JSONB DEFAULT '{}';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_to_platform_url TEXT;

UPDATE courses SET org_id = '00000000-0000-0000-0000-0000000000aa' WHERE org_id IS NULL;
ALTER TABLE courses ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_org_id ON courses(org_id);

-- ════════════════════════════════════════════════════════════════════════════
-- COURSE RESEARCH (was a TS type with no table)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS course_research (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  competitor_courses JSONB DEFAULT '[]',
  curriculum_gaps JSONB DEFAULT '[]',
  job_market_skills JSONB DEFAULT '[]',
  industry_trends JSONB DEFAULT '[]',
  best_existing_course JSONB,
  why_better JSONB DEFAULT '[]',
  positioning_statement TEXT,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_course_research_course_id ON course_research(course_id);

-- ════════════════════════════════════════════════════════════════════════════
-- COACH INPUTS (was a TS type with no table)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS coach_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  key_topics TEXT,
  examples TEXT,
  visual_requirements TEXT,
  difficulty_notes TEXT,
  "references" TEXT,
  special_instructions TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coach_inputs_video_id ON coach_inputs(video_id);
CREATE INDEX IF NOT EXISTS idx_coach_inputs_course_id ON coach_inputs(course_id);

-- ════════════════════════════════════════════════════════════════════════════
-- GENERIC COMMENTS (toc_comments was a special case; commentable everywhere)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  author_role TEXT DEFAULT 'coach' CHECK (author_role IN ('pm','coach','ai')),
  text TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('module','lesson','video','toc','brief','ppt','content','assessment','transcript','general')),
  target_id TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_ai_flag BOOLEAN DEFAULT FALSE,
  is_ask_pm BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_course_target ON comments(course_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_unresolved ON comments(course_id) WHERE resolved = FALSE;

-- Backfill any existing toc_comments into the generic comments table
INSERT INTO comments (id, course_id, org_id, author_name, author_role, text, target_type, target_id, resolved, resolved_at, created_at, updated_at)
SELECT tc.id, tc.course_id, c.org_id, tc.author_name, tc.author_role, tc.text, tc.target_type, tc.target_id, tc.resolved, tc.resolved_at, tc.created_at, tc.updated_at
FROM toc_comments tc
JOIN courses c ON c.id = tc.course_id
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- ASSESSMENTS — first-class instead of JSON-blob in content_items
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('practice_quiz','graded_quiz','case_study','peer_review')),
  description TEXT,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  attempts_allowed INTEGER DEFAULT 3,
  randomize_questions BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON assessments(course_id);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mcq_single','mcq_multi','true_false','short_answer','long_answer','code','peer_assessed')),
  options JSONB DEFAULT '[]',     -- [{ id, text }]
  correct_answers JSONB DEFAULT '[]', -- [option_id] for MCQ; for short/code may include rubric
  explanation TEXT,
  weight INTEGER DEFAULT 1,
  bloom_level TEXT CHECK (bloom_level IN ('remember','understand','apply','analyze','evaluate','create')),
  learning_objective_id TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_assessment_id ON questions(assessment_id);

-- ════════════════════════════════════════════════════════════════════════════
-- PPT UPLOADS — was in TS, missing in v1
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ppt_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT,
  slide_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','parsing','parsed','ai_editing','finalized')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ppt_uploads_video_id ON ppt_uploads(video_id);

-- ════════════════════════════════════════════════════════════════════════════
-- ACTIVITY LOG — for PM dashboard "what did the coach do today"
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_course_recent ON activity_log(course_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','action','warning')),
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- BACKFILL ORG_ID on existing tables
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['modules','lessons','videos','content_items','toc_comments','content_briefs','ppt_slides','recordings','transcripts','toc_versions'])
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE %I SET org_id = c.org_id FROM courses c WHERE %I.course_id = c.id AND %I.org_id IS NULL', t, t, t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN org_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_org_id ON %I(org_id)', t, t);
  END LOOP;
END
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- HELPER: which org does the calling user belong to
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_user_org_id() RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_profile_id() RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- DROP the open "Allow all" demo policies from migration v1
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
  p TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','courses','modules','lessons','videos',
    'content_items','toc_comments','content_briefs',
    'ppt_slides','recordings','transcripts','toc_versions'
  ])
  LOOP
    FOR p IN SELECT unnest(ARRAY[
      format('Allow all select on %s', t),
      format('Allow all insert on %s', t),
      format('Allow all update on %s', t),
      format('Allow all delete on %s', t)
    ])
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
    END LOOP;
  END LOOP;
END
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — real policies, scoped to org
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE orgs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_research   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_inputs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_uploads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- Org membership: users see only their own org
CREATE POLICY org_member_select ON orgs FOR SELECT
  USING (id = current_user_org_id());

-- Profiles: see profiles in your org
CREATE POLICY profile_org_select ON profiles FOR SELECT
  USING (org_id = current_user_org_id());
CREATE POLICY profile_self_update ON profiles FOR UPDATE
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- Generic policy: org members can read everything in their org;
-- writes are gated by role or assignment.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'courses','modules','lessons','videos','content_items',
    'content_briefs','ppt_slides','recordings','transcripts',
    'toc_versions','course_research','coach_inputs','comments',
    'assessments','questions','ppt_uploads','activity_log','notifications'
  ])
  LOOP
    EXECUTE format($p$CREATE POLICY %I ON %I FOR SELECT USING (org_id = current_user_org_id())$p$,
      'org_select_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR INSERT WITH CHECK (org_id = current_user_org_id())$p$,
      'org_insert_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR UPDATE USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())$p$,
      'org_update_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR DELETE USING (org_id = current_user_org_id() AND current_user_role() = 'pm')$p$,
      'org_delete_' || t, t);
  END LOOP;
END
$$;

-- Notifications: only the recipient can read theirs
DROP POLICY IF EXISTS org_select_notifications ON notifications;
CREATE POLICY notifications_self_select ON notifications FOR SELECT
  USING (user_id = current_profile_id());
CREATE POLICY notifications_self_update ON notifications FOR UPDATE
  USING (user_id = current_profile_id()) WITH CHECK (user_id = current_profile_id());

-- Course locking: only PM can flip toc_locked, status, or publish
CREATE POLICY courses_pm_only_publish ON courses FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (
    org_id = current_user_org_id()
    AND (
      current_user_role() = 'pm'
      OR (
        -- coach can update non-gating fields only (enforced at app layer too)
        current_user_role() = 'coach'
      )
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS: bump updated_at, write activity_log on key actions
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION bump_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'orgs','profiles','courses','modules','lessons','videos','content_items',
    'comments','content_briefs','ppt_slides','recordings','transcripts',
    'coach_inputs','assessments','questions','ppt_uploads'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_bump_%I ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_bump_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION bump_updated_at()', t, t);
  END LOOP;
END
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- DONE. Smoke test query (run after migrating):
--   SELECT count(*) FROM courses;          -- should equal v1 count
--   SELECT count(*) FROM comments;         -- should be >= toc_comments count
--   SELECT current_user_org_id();          -- should NOT be NULL when logged in
-- ════════════════════════════════════════════════════════════════════════════
