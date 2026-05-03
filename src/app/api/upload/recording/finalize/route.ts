// POST /api/upload/recording/finalize
//
// After the browser uploaded directly to Supabase Storage via the signed
// URL, it calls this endpoint with the storage path. We:
//   1. Replace any existing recording row for the video
//   2. Insert the new row pointing at the uploaded object
//   3. Fire /api/transcribe in the background
//
// Body: { videoId, courseId, path, contentType }

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: { videoId: string; courseId: string; path: string; contentType?: string; filename?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.videoId || !body.courseId || !body.path) {
    return NextResponse.json({ error: "videoId, courseId, path required" }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: course } = await sb.from("courses").select("org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: video } = await sb
    .from("videos")
    .select("id, lesson_id")
    .eq("id", body.videoId).eq("course_id", body.courseId)
    .maybeSingle();
  if (!video) return NextResponse.json({ error: "video not found" }, { status: 404 });

  const isAudio = (body.contentType ?? "").startsWith("audio/");

  await sb.from("recordings").delete().eq("video_id", body.videoId);
  const { data: rec, error: insErr } = await sb.from("recordings").insert({
    org_id: auth.orgId,
    course_id: body.courseId,
    lesson_id: video.lesson_id,
    video_id: body.videoId,
    recording_type: "upload",
    audio_url: isAudio ? body.path : null,
    video_url: isAudio ? null : body.path,
    status: "uploaded",
  }).select("id").single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await recordActivity(sb, {
    orgId: auth.orgId, userId: auth.profileId, userName: auth.email ?? undefined, userRole: auth.role,
    courseId: body.courseId, action: "recording.uploaded",
    targetType: "video", targetId: body.videoId,
    details: { filename: body.filename ?? body.path, kind: isAudio ? "audio" : "video", path: body.path },
  });

  // Note: transcription is triggered by the client, not here.
  // Vercel cancels in-flight fetches when a serverless function returns,
  // so a background fetch from the server never actually runs.
  return NextResponse.json({ recording_id: rec.id, status: "uploaded" });
}
