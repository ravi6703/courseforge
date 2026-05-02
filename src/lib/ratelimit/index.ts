// src/lib/ratelimit/index.ts
//
// Per-org rate limiter for /api/ai/* routes. Database-backed because we
// don't assume Vercel KV / Upstash is provisioned. Uses a single Postgres
// RPC that does the SELECT-INSERT-UPDATE atomically.
//
// Buckets: per-(org, route, minute). Defaults are conservative — tune in
// the env once you have real usage data.
//
// Usage:
//   const limit = await checkRateLimit(auth.orgId, "generate-toc");
//   if (!limit.ok) return rateLimitResponse(limit);

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export interface RateLimitDecision {
  ok: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
  reason?: string;
}

export interface RateLimitConfig {
  perMinute: number;
  perDay: number;
}

// One-place tuning. Override per-route by passing an explicit config.
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "generate-toc":       { perMinute: 5,  perDay: 100  },
  "improve-toc":        { perMinute: 10, perDay: 300  },
  "generate-brief":     { perMinute: 30, perDay: 1000 },
  "generate-content":   { perMinute: 30, perDay: 2000 },
  "generate-slides":    { perMinute: 20, perDay: 500  },
  "suggest-toc-item":   { perMinute: 60, perDay: 2000 },
  default:              { perMinute: 30, perDay: 1000 },
};

/**
 * Atomic check-and-increment via Postgres RPC. Returns ok=false if either
 * the per-minute or per-day budget is exhausted.
 *
 * Service role is required because the rate-limit table is shared across
 * orgs and we want a single hot index to serve all callers without RLS
 * overhead. This is a legitimate use of service role (no user data leaves
 * the function).
 */
export async function checkRateLimit(
  orgId: string,
  route: string,
  cfg: RateLimitConfig = DEFAULT_LIMITS[route] ?? DEFAULT_LIMITS.default
): Promise<RateLimitDecision> {
  // If env says skip (e.g. local dev), fail open.
  if (process.env.AI_RATE_LIMIT_DISABLED === "1") {
    return { ok: true, limit: cfg.perMinute, remaining: cfg.perMinute, resetSec: 60 };
  }

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc("ai_rate_limit_check", {
      p_org_id: orgId,
      p_route: route,
      p_per_minute: cfg.perMinute,
      p_per_day: cfg.perDay,
    });

    if (error) {
      // Fail open on infrastructure errors — better than a global outage if
      // the rate-limit table is missing or the RPC is unavailable. Log loudly.
      console.error("[ratelimit] RPC error, failing open:", error.message);
      return { ok: true, limit: cfg.perMinute, remaining: cfg.perMinute, resetSec: 60 };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { allowed: boolean; remaining_minute: number; remaining_day: number; reset_seconds: number; reason?: string }
      | null;

    if (!row) {
      return { ok: true, limit: cfg.perMinute, remaining: cfg.perMinute, resetSec: 60 };
    }

    return {
      ok: row.allowed,
      limit: cfg.perMinute,
      remaining: Math.min(row.remaining_minute, row.remaining_day),
      resetSec: row.reset_seconds,
      reason: row.reason,
    };
  } catch (e) {
    console.error("[ratelimit] unexpected error, failing open:", e);
    return { ok: true, limit: cfg.perMinute, remaining: cfg.perMinute, resetSec: 60 };
  }
}

/**
 * Standard 429 response with rate-limit headers, suitable for direct return
 * from a route handler.
 */
export function rateLimitResponse(decision: RateLimitDecision): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      reason: decision.reason ?? "Too many AI requests for this organisation. Try again shortly.",
      retry_after_seconds: decision.resetSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.resetSec),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(Math.max(decision.remaining, 0)),
        "X-RateLimit-Reset": String(decision.resetSec),
      },
    }
  );
}
