-- ════════════════════════════════════════════════════════════════════════════
-- Bundle 2: pedagogy moat — public health score opt-in
-- ════════════════════════════════════════════════════════════════════════════
-- Adds an opt-in flag so course owners can publish their health score on a
-- public, shareable, search-indexable page. The /health-score/[id] page and
-- /api/health-score/[id]/badge.svg both gate on this flag.
--
-- Default false: existing courses stay private until the owner explicitly
-- toggles "Make health score public" in course settings.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS public_health_score BOOLEAN NOT NULL DEFAULT FALSE;

-- Lookup index — public health-score requests will be hit by anonymous
-- traffic and we want the gate check to be a single index probe.
CREATE INDEX IF NOT EXISTS idx_courses_public_health_score
  ON courses(id) WHERE public_health_score = TRUE;
