-- ════════════════════════════════════════════════════════════════════════════
-- Product overhaul v1
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the schema surface for the May 2026 product overhaul:
--   1. video_type tag on videos + ideal duration
--   2. course_timelines + timeline_steps (Gantt / project plan)
--   3. ppt deck settings (tone, template, brand kit, slide count)
--   4. content brief script settings (script_format, script_required)
--   5. content_items format prefs + tab kinds (blog / quiz / worksheet etc.)
--   6. course-level target completion date / days-to-complete
--   7. notifications table (slip detection, asset-ready prompts)
--
-- All additions are nullable / defaulted so existing courses keep working
-- with sensible defaults backfilled below.

-- ────────────────────────────────────────────────────────────────────────
-- 1. Videos: type tag + ideal duration + content_type (drives downstream)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS video_type TEXT
    NOT NULL DEFAULT 'theory'
    CHECK (video_type IN ('theory','conceptual','demo','hands_on','exercise','recap','project','mixed')),
  ADD COLUMN IF NOT EXISTS ideal_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS content_type TEXT
    NOT NULL DEFAULT 'theory'
    CHECK (content_type IN ('theory','conceptual','practical','hands_on','mixed','project'));

-- Backfill ideal duration from existing duration_minutes if present
UPDATE videos SET ideal_duration_minutes = COALESCE(duration_minutes, 8)
WHERE ideal_duration_minutes IS NULL;

-- ────────────────────────────────────────────────────────────────────────
-- 2. Course-level target completion + Gantt timeline tables
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS target_completion_date DATE,
  ADD COLUMN IF NOT EXISTS target_days INTEGER;

-- One timeline per course (created when TOC is locked)
CREATE TABLE IF NOT EXISTS course_timelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track','at_risk','slipping','complete')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id)
);

-- Per-lesson Gantt steps (script → slides → record → edit → transcript → assets → publish)
CREATE TABLE IF NOT EXISTS timeline_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_id UUID NOT NULL REFERENCES course_timelines(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  step_kind TEXT NOT NULL CHECK (step_kind IN
    ('profile','toc','brief','slides','record','transcript','assets','publish','review')),
  step_order INTEGER NOT NULL DEFAULT 0,
  scheduled_start DATE NOT NULL,
  scheduled_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','done','blocked')),
  depends_on UUID REFERENCES timeline_steps(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeline_steps_timeline ON timeline_steps(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_steps_course ON timeline_steps(course_id);
CREATE INDEX IF NOT EXISTS idx_timeline_steps_lesson ON timeline_steps(lesson_id);

-- ────────────────────────────────────────────────────────────────────────
-- 3. PPT deck settings — tone, template, brand kit, slide count target
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS ppt_settings JSONB
    NOT NULL DEFAULT jsonb_build_object(
      'tone','conversational',
      'template','minimal',
      'brand_kit', jsonb_build_object(
        'primary','#0B5FFF',
        'accent','#10B981',
        'font','Inter'
      ),
      'slide_count_target', 12,
      'must_include', jsonb_build_array('intro_slide','summary_slide')
    );

-- Per-deck overrides (videos/ppt level)
ALTER TABLE ppt_slides
  ADD COLUMN IF NOT EXISTS deck_settings JSONB DEFAULT '{}'::jsonb;

-- ────────────────────────────────────────────────────────────────────────
-- 4. Content briefs — script generation flags
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE content_briefs
  ADD COLUMN IF NOT EXISTS script_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS script_format TEXT
    CHECK (script_format IN ('storyboard','example_driven','hook_first','problem_solution','narrative')),
  ADD COLUMN IF NOT EXISTS script_target_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS content_type TEXT
    CHECK (content_type IN ('theory','conceptual','practical','hands_on','mixed','project'));

-- ────────────────────────────────────────────────────────────────────────
-- 5. Content items — format prefs (blog length, quiz type, worksheet format)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS format_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
-- Shape:
--   { blog: { length: 'short'|'long' },
--     quiz: { types: ['mcq','scenario','fill_blank'], count: 5 },
--     worksheet: { format: 'pdf'|'notion'|'interactive' } }

-- Extend content_status enum so transcript-spawned generations can mark
-- themselves "generating" while a worker fills in the payload. Existing
-- rows are unaffected.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'content_status' AND e.enumlabel = 'generating'
  ) THEN
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'generating';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'content_status' AND e.enumlabel = 'in_review'
  ) THEN
    ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'in_review';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────
-- 6. Notifications — slip detection + asset-ready signals
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN
    ('step_slipping','step_blocked','asset_ready','deadline_at_risk','transcript_ready','profile_changed')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','danger')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_course_unread
  ON course_notifications(course_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

ALTER TABLE course_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_org_select ON course_notifications;
CREATE POLICY notif_org_select ON course_notifications FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE org_id = current_user_org_id()
    )
  );
DROP POLICY IF EXISTS notif_org_insert ON course_notifications;
CREATE POLICY notif_org_insert ON course_notifications FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE org_id = current_user_org_id()
    )
  );
DROP POLICY IF EXISTS notif_org_update ON course_notifications;
CREATE POLICY notif_org_update ON course_notifications FOR UPDATE
  USING (
    course_id IN (
      SELECT id FROM courses WHERE org_id = current_user_org_id()
    )
  );

-- ────────────────────────────────────────────────────────────────────────
-- 7. RLS for new tables (course_timelines / timeline_steps)
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE course_timelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timeline_org_all ON course_timelines;
CREATE POLICY timeline_org_all ON course_timelines FOR ALL
  USING (
    course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id())
  )
  WITH CHECK (
    course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id())
  );

ALTER TABLE timeline_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS steps_org_all ON timeline_steps;
CREATE POLICY steps_org_all ON timeline_steps FOR ALL
  USING (
    course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id())
  )
  WITH CHECK (
    course_id IN (SELECT id FROM courses WHERE org_id = current_user_org_id())
  );

-- ────────────────────────────────────────────────────────────────────────
-- 8. Updated-at trigger for new tables
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bump_updated_at_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timelines_updated_at ON course_timelines;
CREATE TRIGGER trg_timelines_updated_at
  BEFORE UPDATE ON course_timelines
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at_at();

DROP TRIGGER IF EXISTS trg_timeline_steps_updated_at ON timeline_steps;
CREATE TRIGGER trg_timeline_steps_updated_at
  BEFORE UPDATE ON timeline_steps
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at_at();
