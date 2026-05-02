// GET /api/admin/metrics
//
// PROD-3. Surfaces the four success metrics the PRD targets:
//   1. Time-to-publish per course (created_at → published_at)
//   2. TOC revision cycles (count of toc.improved events between locks)
//   3. Coach productivity (courses published per coach per 30d window)
//   4. AI fallback rate (denied / errored AI calls / total in 24h)
//
// Org-scoped — every metric is computed against auth.orgId. Reads use
// the session-bound client so RLS enforces the org boundary.

import { NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  title: string;
  status: string;
  assigned_coach: string | null;
  created_at: string;
  published_at: string | null;
}

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  // Only PMs see the metrics dashboard.
  if (auth.role !== "pm") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getServerSupabase();

  // Pull all courses for the org (RLS filters automatically).
  const { data: courses, error: cErr } = await supabase
    .from("courses")
    .select("id, title, status, assigned_coach, created_at, published_at")
    .order("created_at", { ascending: false });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const cs = (courses ?? []) as CourseRow[];
  const published = cs.filter((c) => c.status === "published" && c.published_at);
  const inProduction = cs.filter((c) => !["draft", "published"].includes(c.status));

  // 1. Time-to-publish (median + mean over published courses).
  const timesToPublishMs = published
    .map((c) => +new Date(c.published_at!) - +new Date(c.created_at))
    .filter((n) => Number.isFinite(n) && n > 0);

  const meanDays = timesToPublishMs.length
    ? Math.round((timesToPublishMs.reduce((s, n) => s + n, 0) / timesToPublishMs.length) / 86400000)
    : null;
  const medianDays = timesToPublishMs.length ? medianOf(timesToPublishMs.map((n) => n / 86400000)) : null;

  // 2. TOC revision cycles per published course (from activity_log).
  let revisionsPerCourse: Array<{ course_id: string; revisions: number }> = [];
  if (published.length) {
    const { data: revRows } = await supabase
      .from("activity_log")
      .select("course_id")
      .eq("action", "toc.improved")
      .in("course_id", published.map((c) => c.id));
    const counts = new Map<string, number>();
    (revRows ?? []).forEach((r) => counts.set(r.course_id as string, (counts.get(r.course_id as string) ?? 0) + 1));
    revisionsPerCourse = published.map((c) => ({ course_id: c.id, revisions: counts.get(c.id) ?? 0 }));
  }
  const meanRevisions = revisionsPerCourse.length
    ? round1(revisionsPerCourse.reduce((s, r) => s + r.revisions, 0) / revisionsPerCourse.length)
    : null;

  // 3. Coach productivity: published courses per coach in the last 30 days.
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const recentlyPublished = published.filter((c) => c.published_at! >= since30d);
  const perCoach = new Map<string, number>();
  recentlyPublished.forEach((c) => {
    if (c.assigned_coach) perCoach.set(c.assigned_coach, (perCoach.get(c.assigned_coach) ?? 0) + 1);
  });
  const coachThroughput = Array.from(perCoach.entries()).map(([coach_id, courses_30d]) => ({ coach_id, courses_30d }));

  // 4. AI fallback rate from ai_request_log over the last 24h.
  const since24h = new Date(Date.now() - 86400000).toISOString();
  const { data: aiRows } = await supabase
    .from("ai_request_log")
    .select("status")
    .gte("created_at", since24h);
  const totalAi = (aiRows ?? []).length;
  const deniedAi = (aiRows ?? []).filter((r) => r.status === "denied").length;
  const erroredAi = (aiRows ?? []).filter((r) => r.status === "error").length;
  const fallbackRate = totalAi ? round1(((deniedAi + erroredAi) / totalAi) * 100) : null;

  return NextResponse.json({
    org_id: auth.orgId,
    generated_at: new Date().toISOString(),
    courses: { total: cs.length, in_production: inProduction.length, published: published.length },
    time_to_publish: {
      sample_size: timesToPublishMs.length,
      mean_days: meanDays,
      median_days: medianDays,
      target_days: 21,  // PRD: 2-3 weeks
    },
    toc_revisions: {
      sample_size: revisionsPerCourse.length,
      mean_per_course: meanRevisions,
      target_max: 2,  // PRD: 1-2 revisions
      per_course: revisionsPerCourse,
    },
    coach_throughput_30d: {
      target_per_coach: 3,  // PRD: 3 courses/month
      per_coach: coachThroughput,
    },
    ai_health_24h: {
      total_requests: totalAi,
      denied: deniedAi,
      errored: erroredAi,
      fallback_rate_pct: fallbackRate,
      target_max_pct: 2,
    },
  });
}

function medianOf(xs: number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? Math.round(sorted[mid]) : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
