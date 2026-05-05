// /api/ppts/slides — POST creates a single slide row.
//
// Used by the per-video PPT editor's "Add slide" button. The bigger
// generation flows (rewrite-by-video, generate-slides) own their own
// endpoints; this is just for one-at-a-time editing.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const videoId: string = body.videoId;
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data: video } = await sb
    .from("videos")
    .select("id, course_id, lesson_id, org_id")
    .eq("id", videoId).maybeSingle();
  if (!video || video.org_id !== auth.orgId) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  const { data, error } = await sb.from("ppt_slides").insert({
    org_id: auth.orgId,
    course_id: video.course_id,
    lesson_id: video.lesson_id,
    video_id: videoId,
    slide_number: typeof body.slide_number === "number" ? body.slide_number : 1,
    title: (body.title ?? "New slide").toString().slice(0, 200),
    content: body.content ?? [],
    speaker_notes: body.speaker_notes ?? "",
    layout_type: body.layout_type ?? "content",
    template_used: "manual",
    status: "generated",
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slide: data });
}
