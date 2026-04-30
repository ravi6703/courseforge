-- CourseForge Database Schema Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/iwariacfwgumshvtwsri/sql/new

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pm' CHECK (role IN ('pm', 'coach')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- COURSES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'infylearn',
  status TEXT NOT NULL DEFAULT 'draft',
  audience_level TEXT DEFAULT 'intermediate',
  duration_weeks INTEGER DEFAULT 6,
  content_types JSONB DEFAULT '[]',
  video_style TEXT DEFAULT 'ppt_based',
  requirements TEXT,
  created_by TEXT,
  assigned_coach TEXT,
  toc_locked BOOLEAN DEFAULT FALSE,
  toc_locked_at TIMESTAMPTZ,
  toc_locked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- MODULES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  learning_objectives JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- LESSONS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  learning_objectives JSONB DEFAULT '[]',
  content_types JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- VIDEOS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 10,
  "order" INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  recording_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- CONTENT ITEMS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  description TEXT,
  duration TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TOC COMMENTS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS toc_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  author_id TEXT,
  author_name TEXT,
  author_role TEXT DEFAULT 'coach',
  text TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- CONTENT BRIEFS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS content_briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  talking_points JSONB DEFAULT '[]',
  visual_cues JSONB DEFAULT '[]',
  examples JSONB DEFAULT '[]',
  key_takeaways JSONB DEFAULT '[]',
  script_outline TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- PPT SLIDES TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ppt_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content JSONB DEFAULT '[]',
  speaker_notes TEXT,
  layout_type TEXT DEFAULT 'content',
  template_used TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- RECORDINGS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  recording_type TEXT DEFAULT 'elevenlabs',
  audio_url TEXT,
  video_url TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TRANSCRIPTS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  text_content TEXT,
  segments JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  confidence NUMERIC(4,2) DEFAULT 0.95,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TOC VERSION HISTORY
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS toc_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  toc_data JSONB NOT NULL,
  generated_by TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_lesson_id ON videos(lesson_id);
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_content_items_lesson_id ON content_items(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_items_course_id ON content_items(course_id);
CREATE INDEX IF NOT EXISTS idx_toc_comments_course_id ON toc_comments(course_id);
CREATE INDEX IF NOT EXISTS idx_content_briefs_video_id ON content_briefs(video_id);
CREATE INDEX IF NOT EXISTS idx_ppt_slides_video_id ON ppt_slides(video_id);
CREATE INDEX IF NOT EXISTS idx_recordings_video_id ON recordings(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_toc_versions_course_id ON toc_versions(course_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE toc_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppt_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE toc_versions ENABLE ROW LEVEL SECURITY;

-- Open RLS policies for demo mode (restrict in production)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','courses','modules','lessons','videos',
    'content_items','toc_comments','content_briefs',
    'ppt_slides','recordings','transcripts','toc_versions'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow all select on %I" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow all insert on %I" ON %I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow all update on %I" ON %I FOR UPDATE USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "Allow all delete on %I" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END
$$;

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: Demo org + profiles
-- (org_id may be NOT NULL if migration_v2 ran first — always seed org before profiles)
-- ═══════════════════════════════════════════════════════════════
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

-- Add org_id to profiles if not already present (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;

INSERT INTO profiles (id, email, name, role, org_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ravi@boardinfinity.com', 'Ravi (PM)', 'pm', '00000000-0000-0000-0000-0000000000aa'),
  ('00000000-0000-0000-0000-000000000002', 'priya@boardinfinity.com', 'Dr. Priya Sharma (Coach)', 'coach', '00000000-0000-0000-0000-0000000000aa')
ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;
