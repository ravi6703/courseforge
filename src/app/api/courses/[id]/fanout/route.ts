// POST /api/courses/[id]/fanout
//
// One-click "generate everything for this course" — enqueues background
// generation_jobs for every (lesson × kind) that is currently missing.
// Optional body { kinds?: string[]; lessonIds?: string[] } limits the
// fanout. Each job is processed by /api/jobs/[id]/run (or a future
// real worker).

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { CONTENT_KINDS } from "@/app/course/[id]/content/types";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const allowedKinds = (body.kinds as string[] | undefined) ?? [...CONTENT_KINDS];
  const lessonFilter = body.lessonIds as string[] | undefined;

  const sb = await getServerSupabase();

  const [{ data: lessons }, { data: items }] = await Promise.all([
    sb.from("lessons").select("id").eq("course_id", id),
    sb.from("content_items").select("lesson_id, kind, status").eq("course_id", id),
  ]);

  const lessonIds = (lessons ?? []).map((l) => l.id).filter((lid) => !lessonFilter || lessonFilter.includes(lid));
  const have = new Set((items ?? []).map((i) => `${i.lesson_id}::${i.kind}`));

  const jobs: Array<{ kind: string; payload: Record<string, unknown> }> = [];
  for (const lid of lessonIds) {
    for (const k of allowedKinds) {
      if (!have.has(`${lid}::${k}`)) {
        jobs.push({ kind: `content:${k}`, payload: { course_id: id, lesson_id: lid, kind: k } });
      }
    }
  }

  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, message: "Everything already exists." });
  }

  const rows = jobs.map((j) => ({
    course_id: id,
    kind: j.kind,
    payload: j.payload,
    status: "queued" as const,
    created_by: auth.profileId,
  }));
  const { error } = await sb.from("generation_jobs").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify
  await sb.from("course_notifications").insert({
    course_id: id,
    kind: "asset_ready",
    severity: "info",
    title: `Queued ${jobs.length} generation job${jobs.length === 1 ? "" : "s"}`,
    body: "Background workers will pick these up. Watch the Content tab for progress.",
    link: `/course/${id}/content`,
  });

  return NextResponse.json({ ok: true, queued: jobs.length });
}
