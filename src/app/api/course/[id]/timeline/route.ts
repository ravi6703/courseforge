// API: GET / POST course timeline (Gantt).
//
// GET   → returns existing timeline + steps, or null if not generated yet.
// POST  → generates a fresh timeline. Body: { targetDays?: number; targetDate?: string }.
//         Replaces any existing timeline for the course.
//
// Generation walks: profile → toc → for each lesson [brief → slides → record →
// transcript → assets] → review → publish.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { planTimeline } from "@/lib/timeline";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: timeline } = await sb
    .from("course_timelines")
    .select("id, start_date, end_date, total_days, status, generated_at")
    .eq("course_id", id)
    .maybeSingle();

  if (!timeline) return NextResponse.json({ timeline: null, steps: [] });

  const { data: steps } = await sb
    .from("timeline_steps")
    .select("id, lesson_id, video_id, module_id, step_kind, step_order, scheduled_start, scheduled_end, actual_start, actual_end, status, notes")
    .eq("timeline_id", timeline.id)
    .order("step_order", { ascending: true });

  return NextResponse.json({ timeline, steps: steps ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    targetDays?: number;
    targetDate?: string;
  };

  const sb = await getServerSupabase();

  // Resolve total days
  let totalDays = body.targetDays ?? 21;
  if (body.targetDate) {
    const tgt = new Date(body.targetDate);
    const days = Math.round((tgt.getTime() - Date.now()) / 86_400_000);
    totalDays = Math.max(3, days);
  }
  totalDays = Math.max(3, Math.min(365, totalDays));

  // Load modules / lessons / videos
  const { data: modules } = await sb
    .from("modules")
    .select("id, order, lessons:lessons(id, order, videos:videos(id, order))")
    .eq("course_id", id)
    .order("order", { ascending: true });

  const orderedModules =
    (modules ?? []).map((m: any) => ({
      id: m.id,
      lessons: (m.lessons ?? []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((l: any) => ({
        id: l.id,
        videos: (l.videos ?? []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((v: any) => ({
          id: v.id,
        })),
      })),
    }));

  const startDate = new Date();
  const { steps, endDate } = planTimeline({ startDate, totalDays, modules: orderedModules });

  // Wipe existing timeline (cascade kills steps via FK)
  await sb.from("course_timelines").delete().eq("course_id", id);

  // Insert new timeline
  const { data: tl, error: tlErr } = await sb
    .from("course_timelines")
    .insert({
      course_id: id,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      total_days: totalDays,
      status: "on_track",
    })
    .select("id")
    .single();
  if (tlErr || !tl) return NextResponse.json({ error: tlErr?.message ?? "create failed" }, { status: 500 });

  // Insert steps
  const stepRows = steps.map((s) => ({
    timeline_id: tl.id,
    course_id: id,
    module_id: s.moduleId,
    lesson_id: s.lessonId,
    video_id: s.videoId,
    step_kind: s.kind,
    step_order: s.order,
    scheduled_start: s.scheduledStart,
    scheduled_end: s.scheduledEnd,
    status: "not_started" as const,
  }));
  const { error: stepErr } = await sb.from("timeline_steps").insert(stepRows);
  if (stepErr) return NextResponse.json({ error: stepErr.message }, { status: 500 });

  // Persist target on courses table for the header pill
  await sb
    .from("courses")
    .update({ target_days: totalDays, target_completion_date: endDate.toISOString().slice(0, 10) })
    .eq("id", id);

  return NextResponse.json({ ok: true, timelineId: tl.id, totalDays, endDate: endDate.toISOString().slice(0, 10) });
}
