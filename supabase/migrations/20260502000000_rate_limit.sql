-- ════════════════════════════════════════════════════════════════════════════
-- CourseForge — Migration v3 (rate limiting + observability)
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the storage + atomic check used by src/lib/ratelimit/index.ts.
--
-- Run AFTER migration_v2.sql.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- ai_request_log: one row per authed AI request, used for both rate limiting
-- and per-org cost analytics. Partition-friendly (created_at indexed); we'll
-- prune rows older than 7 days via cron.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_request_log (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID    NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  route       TEXT    NOT NULL,
  user_id     UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT    NOT NULL DEFAULT 'allowed' CHECK (status IN ('allowed','denied','error')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_org_route_time ON ai_request_log(org_id, route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_recent ON ai_request_log(created_at DESC);

ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;

-- Org members can read their own org's log (for the metrics dashboard).
CREATE POLICY ai_log_org_select ON ai_request_log FOR SELECT
  USING (org_id = current_user_org_id());

-- ════════════════════════════════════════════════════════════════════════════
-- ai_rate_limit_check: atomic check + record. Returns (allowed, remaining
-- per minute, remaining per day, reset seconds).
--
-- SECURITY DEFINER so service-role calls and authed calls both work; the
-- function itself enforces the (org_id, route, p_per_minute, p_per_day)
-- contract — there is no read of arbitrary org data from inside it.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION ai_rate_limit_check(
  p_org_id      UUID,
  p_route       TEXT,
  p_per_minute  INTEGER,
  p_per_day     INTEGER
)
RETURNS TABLE (
  allowed             BOOLEAN,
  remaining_minute    INTEGER,
  remaining_day       INTEGER,
  reset_seconds       INTEGER,
  reason              TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  minute_count INTEGER;
  day_count    INTEGER;
  v_allowed    BOOLEAN;
  v_reason     TEXT;
BEGIN
  SELECT count(*) INTO minute_count
    FROM ai_request_log
    WHERE org_id = p_org_id
      AND route = p_route
      AND status = 'allowed'
      AND created_at >= NOW() - INTERVAL '1 minute';

  SELECT count(*) INTO day_count
    FROM ai_request_log
    WHERE org_id = p_org_id
      AND route = p_route
      AND status = 'allowed'
      AND created_at >= NOW() - INTERVAL '1 day';

  IF minute_count >= p_per_minute THEN
    v_allowed := FALSE;
    v_reason  := format('Per-minute limit reached (%s requests in the last 60s).', p_per_minute);
  ELSIF day_count >= p_per_day THEN
    v_allowed := FALSE;
    v_reason  := format('Per-day limit reached (%s requests in the last 24h).', p_per_day);
  ELSE
    v_allowed := TRUE;
    v_reason  := NULL;
  END IF;

  INSERT INTO ai_request_log (org_id, route, status, reason)
    VALUES (p_org_id, p_route, CASE WHEN v_allowed THEN 'allowed' ELSE 'denied' END, v_reason);

  RETURN QUERY SELECT
    v_allowed,
    GREATEST(p_per_minute - minute_count - (CASE WHEN v_allowed THEN 1 ELSE 0 END), 0),
    GREATEST(p_per_day    - day_count    - (CASE WHEN v_allowed THEN 1 ELSE 0 END), 0),
    60,
    v_reason;
END
$$;

-- Pruning helper (run from a cron / pg_cron):
--   SELECT ai_request_log_prune();
CREATE OR REPLACE FUNCTION ai_request_log_prune() RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
BEGIN
  DELETE FROM ai_request_log WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;
