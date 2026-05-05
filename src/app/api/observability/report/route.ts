// /api/observability/report
//
// Tiny endpoint the global-error boundary posts client-side errors to.
// Forwards them through `captureException` so SENTRY_DSN stays server-only.
// Auth is intentionally skipped because crashes can happen on signed-out
// pages (login/signup); we accept anonymous reports but rate-limit by IP.

import { NextRequest, NextResponse } from "next/server";
import { captureException } from "@/lib/observability/sentry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inFlight = new Map<string, number>();

function ipFrom(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(ip: string): boolean {
  const last = inFlight.get(ip) ?? 0;
  const now = Date.now();
  if (now - last < 1000) return true; // 1 report/sec/IP
  inFlight.set(ip, now);
  // Keep the map small.
  if (inFlight.size > 1000) {
    for (const [k, t] of inFlight) if (now - t > 60_000) inFlight.delete(k);
  }
  return false;
}

export async function POST(req: NextRequest) {
  const ip = ipFrom(req);
  if (rateLimited(ip)) return NextResponse.json({ ok: true, throttled: true });

  let body: { message?: string; stack?: string; digest?: string; url?: string } = {};
  try { body = await req.json(); } catch { /* tolerate */ }

  const err = new Error(String(body.message ?? "client error").slice(0, 500));
  if (body.stack) err.stack = body.stack;

  await captureException(err, {
    source: "global-error",
    tags: { side: "client", digest: body.digest ?? "", ip },
    extra: { url: body.url },
    level: "error",
  });

  return NextResponse.json({ ok: true });
}
