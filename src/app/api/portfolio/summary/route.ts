// GET /api/portfolio/summary
//
// Powers the dashboard "Project plan" glimpse card and the portfolio
// /projects page header tiles. Returns:
//   - atRisk: top 3 courses slipping or with tight deadlines
//   - thisWeek: count of timeline_steps scheduled to finish in next 7 days
//   - bottleneckKind: most-stuck step kind across all courses

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { STEP_LABELS, type TimelineStepKind } from "@/lib/timeline";

export const runtime = "nodejs";

export async function GET() {
  const sb = await getServerSupabase();
  const [{ data: courses }, { data: steps }] = await Promise.all([
    sb.from("courses").select("id, title, status, target_completion_date").neq("status", "draft").neq("status", "published"),
    sb.from("timeline_steps").select("course_id, step_kind, scheduled_end, status"),
  ]);

  const cs = courses ?? [];
  const allSteps = steps ?? [];
  const now = Date.now();
  const weekAhead = now + 7 * 86_400_000;

  const stepsByCourse = new Map<string, typeof allSteps>();
  allSteps.forEach((s) => {
    const list = stepsByCourse.get(s.course_id) ?? [];
    list.push(s);
    stepsByCourse.set(s.course_id, list);
  });

  const atRisk = cs
    .map((c) => {
      const my = stepsByCourse.get(c.id) ?? [];
      const slipCount = my.filter((s) => s.status !== "done" && new Date(s.scheduled_end).getTime() < now).length;
      const daysToDeadline = c.target_completion_date
        ? Math.round((new Date(c.target_completion_date).getTime() - now) / 86_400_000)
        : null;
      const tight = daysToDeadline !== null && daysToDeadline < 7;
      return { id: c.id, title: c.title, slipCount, daysToDeadline, tight };
    })
    .filter((c) => c.slipCount > 0 || c.tight)
    .sort((a, b) => b.slipCount - a.slipCount)
    .slice(0, 3);

  const thisWeek = allSteps.filter((s) => {
    if (s.status === "done") return false;
    const t = new Date(s.scheduled_end).getTime();
    return t >= now && t <= weekAhead;
  }).length;

  const byKind = new Map<string, { done: number; total: number }>();
  allSteps.forEach((s) => {
    const cur = byKind.get(s.step_kind) ?? { done: 0, total: 0 };
    cur.total++;
    if (s.status === "done") cur.done++;
    byKind.set(s.step_kind, cur);
  });
  let bottleneck: TimelineStepKind | null = null;
  let lo = 1.1;
  for (const [k, v] of byKind.entries()) {
    if (v.total < 3) continue;
    const r = v.done / v.total;
    if (r < lo) { lo = r; bottleneck = k as TimelineStepKind; }
  }

  return NextResponse.json({
    atRisk,
    thisWeek,
    bottleneckKind: bottleneck,
    bottleneckLabel: bottleneck ? STEP_LABELS[bottleneck] : null,
    inProductionCount: cs.length,
  });
}
