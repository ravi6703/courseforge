// POST /api/course/[id]/timeline/auto-adjust
//
// Detects slipping steps and shifts every downstream step by the slip
// duration. Returns a summary the coach can confirm (or undo).
//
// Strategy: for each lesson sequence, find the first slipping step;
// compute the slip days; shift all subsequent step rows in step_order
// by that many days.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: timeline } = await sb
    .from("course_timelines")
    .select("id, end_date")
    .eq("course_id", id)
    .maybeSingle();
  if (!timeline) return NextResponse.json({ error: "no timeline" }, { status: 404 });

  const { data: stepsRaw } = await sb
    .from("timeline_steps")
    .select("id, scheduled_start, scheduled_end, status, step_order, lesson_id")
    .eq("timeline_id", timeline.id)
    .order("step_order", { ascending: true });

  const steps = stepsRaw ?? [];
  const now = Date.now();

  // Slipping = past scheduled_end and not done. We compute the WORST
  // slip across the whole timeline and shift everything after it.
  let worstSlipDays = 0;
  let firstSlipOrder = Infinity;
  for (const s of steps) {
    if (s.status === "done") continue;
    const due = new Date(s.scheduled_end).getTime();
    if (due < now) {
      const days = Math.ceil((now - due) / 86_400_000);
      if (days > worstSlipDays) worstSlipDays = days;
      if (s.step_order < firstSlipOrder) firstSlipOrder = s.step_order;
    }
  }

  if (worstSlipDays === 0) {
    return NextResponse.json({ ok: true, shiftedCount: 0, slipDays: 0, message: "Nothing slipping." });
  }

  const updates = steps
    .filter((s) => s.step_order > firstSlipOrder && s.status !== "done")
    .map((s) => ({
      id: s.id,
      scheduled_start: shiftIso(s.scheduled_start, worstSlipDays),
      scheduled_end:   shiftIso(s.scheduled_end,   worstSlipDays),
    }));

  // Apply updates in batch (one row at a time, the volume is small).
  for (const u of updates) {
    await sb.from("timeline_steps").update(u).eq("id", u.id);
  }

  // Push the timeline end_date out as well.
  const newEndDate = shiftIso(timeline.end_date, worstSlipDays);
  await sb.from("course_timelines").update({ end_date: newEndDate, status: "slipping" }).eq("id", timeline.id);
  await sb.from("courses").update({ target_completion_date: newEndDate }).eq("id", id);

  // Notify
  await sb.from("course_notifications").insert({
    course_id: id,
    kind: "deadline_at_risk",
    severity: "warn",
    title: `Timeline auto-adjusted by ${worstSlipDays}d`,
    body: `${updates.length} downstream step${updates.length === 1 ? "" : "s"} shifted to absorb the slip. New end date: ${newEndDate}.`,
    link: `/course/${id}/timeline`,
  });

  return NextResponse.json({
    ok: true,
    shiftedCount: updates.length,
    slipDays: worstSlipDays,
    newEndDate,
  });
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
