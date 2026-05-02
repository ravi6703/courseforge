// POST /api/transcribe
//
// Phase 8a — Trigger Whisper transcription for a recording. Inline for
// pilot (no queue worker), but tracked via transcription_jobs so a
// queue can be slotted in later without changing the API surface.
//
// Request body: { recording_id: uuid }
// Response:     { job_id, transcript_id, text_length, segments? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser, getServiceSupabase } from "@/lib/supabase/server";
import { transcribe, transcribeProvider } from "@/lib/transcribe";
import { recordActivity } from "@/lib/activity";
import { logger, requestId } from "@/lib/log";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — Whisper can take a while

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const log = logger("api/transcribe").child({ req: requestId(), org: auth.orgId });

  // Cheap rate limit — transcription is expensive ($0.006/min for OpenAI).
  const __rl = await checkRateLimit(auth.orgId, "transcribe", { perMinute: 5, perDay: 100 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  if (!transcribeProvider()) {
    return NextResponse.json(
      { error: "No transcription provider configured. Set OPENAI_API_KEY or REPLICATE_API_TOKEN." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const recordingId: string = body?.recording_id;
  if (!recordingId) return NextResponse.json({ error: "recording_id required" }, { status: 400 });

  const sb = await getServerSupabase();

  // Pull the recording row (RLS filters by org).
  const { data: rec, error: recErr } = await sb
    .from("recordings")
    .select("id, course_id, lesson_id, video_id, audio_url, video_url, duration_seconds")
    .eq("id", recordingId)
    .maybeSingle();
  if (recErr || !rec) return NextResponse.json({ error: "recording not found" }, { status: 404 });

  // Pick the best URL: prefer audio if we have it; otherwise the video
  // file (Whisper handles both). audio_url may be a storage path or a
  // public URL; convert paths to signed URLs.
  const sourceUrl = await resolveAudioUrl(rec.audio_url ?? rec.video_url ?? "");
  if (!sourceUrl) {
    return NextResponse.json({ error: "recording has no audio or video URL" }, { status: 400 });
  }

  // Course title for the prompt hint.
  const { data: course } = await sb.from("courses").select("title").eq("id", rec.course_id).maybeSingle();

  // Insert job row.
  const { data: job, error: jobErr } = await sb.from("transcription_jobs").insert({
    org_id: auth.orgId,
    course_id: rec.course_id,
    recording_id: rec.id,
    status: "running",
    provider: transcribeProvider(),
    started_at: new Date().toISOString(),
  }).select("id").single();
  if (jobErr || !job) {
    log.error({ err: jobErr }, "could not create job");
    return NextResponse.json({ error: jobErr?.message ?? "could not create job" }, { status: 500 });
  }

  let result;
  try {
    result = await transcribe({
      audioUrl: sourceUrl,
      prompt: course?.title ? `Course: ${course.title}` : undefined,
    });
  } catch (e) {
    const msg = (e as Error).message;
    log.error({ err: e, jobId: job.id }, "transcription failed");
    await sb.from("transcription_jobs").update({
      status: "error", error: msg, finished_at: new Date().toISOString(),
    }).eq("id", job.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Insert / replace transcript row for this recording.
  await sb.from("transcripts").delete().eq("recording_id", recordingId);
  const { data: t, error: tErr } = await sb.from("transcripts").insert({
    recording_id: rec.id,
    video_id: rec.video_id,
    lesson_id: rec.lesson_id,
    course_id: rec.course_id,
    org_id: auth.orgId,
    text_content: result.text,
    segments: result.segments ?? [],
    language: result.language ?? "en",
    confidence: 0.95,
    word_count: result.text.split(/\s+/).filter(Boolean).length,
    status: "ready",
  }).select("id").single();

  if (tErr) {
    log.error({ err: tErr }, "transcript insert failed");
    await sb.from("transcription_jobs").update({
      status: "error", error: tErr.message, finished_at: new Date().toISOString(),
    }).eq("id", job.id);
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  await sb.from("transcription_jobs").update({
    status: "complete",
    duration_seconds: result.duration_seconds ?? null,
    finished_at: new Date().toISOString(),
  }).eq("id", job.id);

  await recordActivity(sb, {
    orgId: auth.orgId,
    userId: auth.profileId,
    userName: auth.email ?? undefined,
    userRole: auth.role,
    courseId: rec.course_id,
    action: "recording.transcribed",
    targetType: "recording",
    targetId: rec.id,
    details: { word_count: result.text.split(/\s+/).filter(Boolean).length, provider: result.provider },
  });

  return NextResponse.json({
    job_id: job.id,
    transcript_id: t!.id,
    text_length: result.text.length,
    segments: result.segments?.length ?? 0,
    provider: result.provider,
  });
}

// If audio_url is a path inside our recordings bucket, mint a signed URL.
// If it's already an https:// URL, pass it through.
async function resolveAudioUrl(raw: string): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  // Treat anything else as a path inside the 'recordings' bucket.
  const service = getServiceSupabase();
  const { data, error } = await service.storage.from("recordings").createSignedUrl(raw, 60 * 30);
  if (error) return null;
  return data.signedUrl;
}
