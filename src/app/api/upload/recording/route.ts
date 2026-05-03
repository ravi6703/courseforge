// POST /api/upload/recording
//
// Coach uploads an .mp4/.m4a/.wav directly. Stored in the 'recordings'
// bucket under <org_id>/<course_id>/<video_id>.<ext>; a recordings row
// is created linking the video to the storage path, and (if a transcribe
// provider is configured) /api/transcribe is fired in the background.
//
// Multipart fields:
//   file:     the audio/video blob
//   videoId:  videos.id
//   courseId: videos.course_id

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser, getServiceSupabase } from "@/lib/supabase/server";  // eslint-disable-line no-restricted-syntax -- legit: storage write needs service
import { recordActivity } from "@/lib/activity";
import { logger, requestId } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — matches bucket cap

const EXT_BY_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const log = logger("api/upload/recording").child({ req: requestId(), org: auth.orgId });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 }); }

  const file = form.get("file");
  const videoId = form.get("videoId") as string | null;
  const courseId = form.get("courseId") as string | null;

  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!videoId || !courseId) return NextResponse.json({ error: "videoId and courseId required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `File exceeds ${MAX_BYTES} bytes` }, { status: 413 });

  const sb = await getServerSupabase();
  const { data: courseRow } = await sb.from("courses").select("org_id").eq("id", courseId).maybeSingle();
  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: videoRow } = await sb.from("videos").select("id, course_id, lesson_id").eq("id", videoId).eq("course_id", courseId).maybeSingle();
  if (!videoRow) return NextResponse.json({ error: "video not found" }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = EXT_BY_MIME[file.type] ?? (file.name.split(".").pop() || "bin").toLowerCase();
  const storagePath = `${auth.orgId}/${courseId}/${videoId}.${ext}`;
  const isAudio = file.type.startsWith("audio/");

  const service = getServiceSupabase();  // eslint-disable-line no-restricted-syntax -- legit: bucket write
  const { error: storeErr } = await service.storage
    .from("recordings")
    .upload(storagePath, buf, { contentType: file.type || "application/octet-stream", upsert: true });
  if (storeErr) {
    log.error({ err: storeErr }, "storage upload failed");
    return NextResponse.json({ error: storeErr.message }, { status: 500 });
  }

  // Replace any existing recording row for this video, then insert fresh.
  await sb.from("recordings").delete().eq("video_id", videoId);
  const { data: rec, error: insErr } = await sb.from("recordings").insert({
    org_id: auth.orgId,
    course_id: courseId,
    lesson_id: videoRow.lesson_id,
    video_id: videoId,
    recording_type: "upload",
    audio_url: isAudio ? storagePath : null,
    video_url: isAudio ? null : storagePath,
    status: "uploaded",
  }).select("id").single();

  if (insErr) {
    log.error({ err: insErr }, "recordings insert failed");
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await recordActivity(sb, {
    orgId: auth.orgId, userId: auth.profileId, userName: auth.email ?? undefined, userRole: auth.role,
    courseId, action: "recording.uploaded", targetType: "video", targetId: videoId,
    details: { filename: file.name, bytes: file.size, kind: isAudio ? "audio" : "video" },
  });

  // Fire transcription in the background (non-blocking). The UI polls status.
  // We use an absolute URL so this works on Vercel where the route runs in a
  // serverless function context.
  const transcribeUrl = new URL("/api/transcribe", req.url).toString();
  fetch(transcribeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ recording_id: rec.id }),
  }).catch((e) => log.warn({ err: e }, "background transcription kickoff failed"));

  return NextResponse.json({ recording_id: rec.id, storage_path: storagePath, status: "uploaded" });
}
