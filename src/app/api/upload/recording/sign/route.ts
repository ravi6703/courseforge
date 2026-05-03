// POST /api/upload/recording/sign
//
// Returns a one-time signed URL the browser can PUT the recording bytes
// directly to. This bypasses Vercel's 4.5MB serverless body limit —
// recordings frequently exceed it (a 10-minute m4a is ~10 MB; an mp4 is
// hundreds).
//
// Body: { videoId, courseId, filename, contentType }
// Response: { upload_url, token, path }
//
// Client then PUTs the file to upload_url, then calls /finalize.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser, getServiceSupabase } from "@/lib/supabase/server";  // eslint-disable-line no-restricted-syntax -- legit: storage signed-url mint

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/m4a": "m4a", "audio/wav": "wav", "audio/x-wav": "wav",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: { videoId: string; courseId: string; filename: string; contentType: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.videoId || !body.courseId || !body.filename) {
    return NextResponse.json({ error: "videoId, courseId, filename required" }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: course } = await sb.from("courses").select("org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: video } = await sb.from("videos").select("id").eq("id", body.videoId).eq("course_id", body.courseId).maybeSingle();
  if (!video) return NextResponse.json({ error: "video not found" }, { status: 404 });

  const ext = EXT_BY_MIME[body.contentType] ?? (body.filename.split(".").pop() || "bin").toLowerCase();
  const path = `${auth.orgId}/${body.courseId}/${body.videoId}.${ext}`;

  const service = getServiceSupabase();  // eslint-disable-line no-restricted-syntax -- legit: storage admin
  // upsert: true so re-uploads overwrite the existing object cleanly
  const { data, error } = await service.storage
    .from("recordings")
    .createSignedUploadUrl(path, { upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path,
  });
}
