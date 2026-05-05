-- ────────────────────────────────────────────────────────────────────────
-- Stale-artifact tracking
-- ────────────────────────────────────────────────────────────────────────
-- When a coach edits learning objectives at any TOC level (course /
-- module / lesson), every downstream artifact becomes potentially out
-- of date. Rather than auto-rewrite (slow, surprising), we flag them
-- as stale and let the coach regenerate at their pace from the relevant
-- stage tab.
--
-- Two columns added to every artifact table:
--   stale_since      timestamptz when the upstream change happened
--   stale_reason     short human-readable string ("course objectives changed")

ALTER TABLE content_briefs ADD COLUMN IF NOT EXISTS stale_since TIMESTAMPTZ;
ALTER TABLE content_briefs ADD COLUMN IF NOT EXISTS stale_reason TEXT;

ALTER TABLE ppt_slides     ADD COLUMN IF NOT EXISTS stale_since TIMESTAMPTZ;
ALTER TABLE ppt_slides     ADD COLUMN IF NOT EXISTS stale_reason TEXT;

ALTER TABLE content_items  ADD COLUMN IF NOT EXISTS stale_since TIMESTAMPTZ;
ALTER TABLE content_items  ADD COLUMN IF NOT EXISTS stale_reason TEXT;
