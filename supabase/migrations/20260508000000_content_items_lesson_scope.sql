-- ════════════════════════════════════════════════════════════════════════════
-- content_items: move from per-video to per-lesson scope
-- ════════════════════════════════════════════════════════════════════════════
-- Per coach feedback: Reading / Practice quiz / Assessment / Worked example /
-- Discussion / SCORM / AI Coach belong to the LESSON, not the video.
-- Videos are units of recording; lessons are units of learning. Briefs and
-- PPT slides remain per-video — those are recording-unit artifacts.
--
-- Changes:
--   1. Add lesson_id (nullable, FK).
--   2. Make video_id nullable.
--   3. CHECK constraint: exactly one of (lesson_id, video_id) is set so old
--      and new rows can coexist while we transition.
--   4. Drop the old UNIQUE(video_id, kind) constraint and replace with two
--      partial unique indexes — one per scope.
--   5. Migrate existing rows: for every content_item attached to a video,
--      copy the video's lesson_id, null the video_id. When a lesson has
--      multiple videos with the same kind, keep the most recently updated
--      row and delete the duplicates.

-- Step 1 — add the new column
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS lesson_id UUID;

-- Step 2 — FK so cascading deletes work end-to-end
ALTER TABLE content_items
  DROP CONSTRAINT IF EXISTS fk_content_lesson;
ALTER TABLE content_items
  ADD CONSTRAINT fk_content_lesson FOREIGN KEY (lesson_id)
    REFERENCES lessons(id) ON DELETE CASCADE;

-- Step 3 — relax the NOT NULL on video_id so lesson-scope rows can exist
ALTER TABLE content_items
  ALTER COLUMN video_id DROP NOT NULL;

-- Step 4 — Dedupe before adding the unique index. For each lesson+kind
-- combination, keep the most recently updated row and remove the rest.
WITH ranked AS (
  SELECT ci.id,
         v.lesson_id AS lid,
         ci.kind,
         ROW_NUMBER() OVER (
           PARTITION BY v.lesson_id, ci.kind
           ORDER BY ci.updated_at DESC NULLS LAST, ci.created_at DESC
         ) AS rn
  FROM content_items ci
  JOIN videos v ON v.id = ci.video_id
  WHERE ci.video_id IS NOT NULL
)
DELETE FROM content_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 5 — Backfill lesson_id from video.lesson_id for existing rows.
UPDATE content_items
SET lesson_id = (SELECT lesson_id FROM videos WHERE videos.id = content_items.video_id),
    video_id  = NULL
WHERE video_id IS NOT NULL;

-- Step 6 — Enforce "exactly one of (lesson_id, video_id) is set."
ALTER TABLE content_items
  DROP CONSTRAINT IF EXISTS content_items_lesson_or_video;
ALTER TABLE content_items
  ADD CONSTRAINT content_items_lesson_or_video CHECK (
    (lesson_id IS NOT NULL AND video_id IS NULL) OR
    (lesson_id IS NULL AND video_id IS NOT NULL)
  );

-- Step 7 — Drop the old per-video UNIQUE and replace with two partial
-- indexes (one per scope). Older Postgres versions name the constraint
-- differently; we tolerate both.
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_video_id_kind_key;
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_video_id_kind_unique;

CREATE UNIQUE INDEX IF NOT EXISTS content_items_lesson_kind_unique
  ON content_items (lesson_id, kind)
  WHERE lesson_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS content_items_video_kind_unique
  ON content_items (video_id, kind)
  WHERE video_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_lesson_id ON content_items(lesson_id);
