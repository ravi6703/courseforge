// POST /api/courses/[id]/multi-export
//
// Body: { targets: ('scorm12'|'scorm2004'|'coursera'|'xapi'|'mp4'|'landing_md'|'linkedin_post')[] }
// Enqueues a multi_target_exports row per target. Real export workers
// pick these up; for SCORM/Coursera/PPTX we already have inline routes
// — this endpoint just records the request so the UI has a unified view.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const targets = (body.targets as string[] | undefined) ?? [];
  if (targets.length === 0) return NextResponse.json({ error: "no targets" }, { status: 400 });

  const sb = await getServerSupabase();
  const rows = targets.map((t) => ({
    course_id: id,
    target: t,
    status: "queued" as const,
  }));
  const { data, error } = await sb.from("multi_target_exports").insert(rows).select("id, target");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify
  await sb.from("course_notifications").insert({
    course_id: id,
    kind: "asset_ready",
    severity: "info",
    title: `Queued ${targets.length} export${targets.length === 1 ? "" : "s"}`,
    body: targets.join(", "),
    link: `/course/${id}/review`,
  });

  return NextResponse.json({ ok: true, queued: data });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { data } = await sb
    .from("multi_target_exports")
    .select("id, target, status, artifact_url, error, created_at, finished_at")
    .eq("course_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ exports: data ?? [] });
}
