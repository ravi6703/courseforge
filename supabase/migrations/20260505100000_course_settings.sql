-- ════════════════════════════════════════════════════════════════════════════
-- Course settings — hierarchy preset, branding assets, default formats
-- ════════════════════════════════════════════════════════════════════════════
-- Per coach feedback: a course should remember its hierarchy preset
-- (Course → Module → Lesson → Item) so platform-specific imports map
-- cleanly, plus the company logo + ppt template chosen at creation, plus
-- the default reading/assessment format the AI should use when generating
-- artifacts.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS hierarchy_preset JSONB
    NOT NULL DEFAULT '{"levels":["course","module","lesson","item"],"label":"Standard"}'::jsonb;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS ppt_template_url TEXT;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Defaults consumed by the Content tab when generating artifacts. These
-- are seeded at course creation, then the coach can override per-video.
--   reading.format        → 'rte' | 'markdown' | 'word'
--   assessment.difficulty → 'beginner' | 'intermediate' | 'advanced'
--   assessment.count      → integer
--   assessment.types      → array of 'mcq_single' | 'mcq_multi' | 'true_false' | 'short_answer'
--   scorm.version         → '1.2' | '2004'
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS content_format_defaults JSONB
    NOT NULL DEFAULT jsonb_build_object(
      'reading',    jsonb_build_object('format','rte'),
      'assessment', jsonb_build_object('difficulty','intermediate','count',5,'types',jsonb_build_array('mcq_single','true_false')),
      'scorm',      jsonb_build_object('version','1.2')
    );
