-- ════════════════════════════════════════════════════════════════════════════
-- Brief — coach-supplied learning objective override
-- ════════════════════════════════════════════════════════════════════════════
-- Coaches sometimes want a brief to focus on a specific objective different
-- from the lesson's default learning_objectives. This column captures that
-- per-brief override so the AI prompt can prioritise it.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE content_briefs
  ADD COLUMN IF NOT EXISTS coach_objective_override TEXT;
