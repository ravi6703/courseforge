// POST /api/webhooks/zoom
//
// Receives Zoom Webhook 2.0 events. We care about:
//   - endpoint.url_validation        (handshake)
//   - recording.completed            (the meaty one)
//
// Idempotency: dedupe via zoom_webhook_events by event id. Signature
// verified via HMAC-SHA256 over v0:ts:body using ZOOM_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, validationChallengeResponse, downloadRecordingFile, refreshTokens } from "@/lib/zoom";
// eslint-disable-next-line no-restricted-syntax -- legit: webhook has no user session; payload is HMAC-verified by verifyWebhook()
import { getServiceSupabase } from "@/lib/supabase/server";
import { logger, requestId } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const log = logger("webhooks/zoom").child({ req: requestId() });
  const rawBody = await req.text();

  // Validate signature first — never parse untrusted JSON.
  if (!verifyWebhook(rawBody, req.headers)) {
    log.warn({}, "invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: { event: string; payload?: unknown; event_ts?: number };
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  // URL validation handshake.
  if (body.event === "endpoint.url_validation") {
    const plainToken = (body.payload as { plainToken: string })?.plainToken;
    if (!plainToken) return NextResponse.json({ error: "missing plainToken" }, { status: 400 });
    return NextResponse.json(validationChallengeResponse(plainToken));
  }

  // Idempotency: synthesise an event id from event+ts+payload-hash if
  // Zoom didn't give us one (they don't include x-zm-trackingid in all
  // events). Crude but stable.
  const eventId = `${body.event}:${body.event_ts ?? Date.now()}:${hashShort(rawBody)}`;

  const sb = getServiceSupabase();
  const { error: dedupErr } = await sb.from("zoom_webhook_events").insert({
    zoom_event_id: eventId,
    zoom_event_type: body.event,
    payload: body,
  });
  // Unique constraint violation = already handled, return 200 so Zoom stops retrying.
  if (dedupErr && (dedupErr as { code?: string }).code === "23505") {
    log.info({ eventId }, "duplicate, ignoring");
    return NextResponse.json({ ok: true, deduped: true });
  }
  if (dedupErr) {
    log.error({ err: dedupErr }, "dedup insert failed");
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  if (body.event === "recording.completed") {
    try {
      await handleRecordingCompleted(body.payload as RecordingPayload);
    } catch (e) {
      log.error({ err: e, eventId }, "recording.completed handler failed");
      // Deliberately return 200 — we recorded the event row; processing
      // will be retried by a separate worker (or manually) by selecting
      // rows where processed_at IS NULL.
      return NextResponse.json({ ok: true, deferred: true });
    }
  }

  await sb.from("zoom_webhook_events").update({ processed_at: new Date().toISOString() }).eq("zoom_event_id", eventId);
  return NextResponse.json({ ok: true });
}

interface RecordingPayload {
  account_id: string;
  object: {
    uuid: string;
    host_email: string;
    host_id: string;
    topic: string;
    duration?: number;
    recording_files: Array<{
      id: string;
      file_type: string;            // MP4, M4A, ...
      download_url: string;
      file_size: number;
      recording_type: string;       // shared_screen_with_speaker_view, audio_only, etc.
    }>;
  };
}

async function handleRecordingCompleted(payload: RecordingPayload) {
  const sb = getServiceSupabase();

  // Find the org by zoom_user_id to know whose bucket to write to.
  const { data: cred } = await sb
    .from("zoom_credentials")
    .select("org_id, access_token, refresh_token, expires_at")
    .eq("zoom_user_id", payload.object.host_id)
    .maybeSingle();
  if (!cred) {
    console.warn("[zoom] no credentials for host_id", payload.object.host_id);
    return;
  }

  // Refresh the token if it's near expiry.
  let token = cred.access_token;
  if (new Date(cred.expires_at).getTime() - Date.now() < 60_000) {
    const refreshed = await refreshTokens(cred.refresh_token);
    token = refreshed.access_token;
    await sb.from("zoom_credentials").update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    }).eq("zoom_user_id", payload.object.host_id);
  }

  // Pick the audio file if available, otherwise the first MP4.
  const files = payload.object.recording_files ?? [];
  const audio = files.find((f) => f.recording_type === "audio_only" || f.file_type === "M4A");
  const video = files.find((f) => f.file_type === "MP4");
  const file = audio ?? video;
  if (!file) return;

  const buf = await downloadRecordingFile(file.download_url, token);

  // Storage path. Without a tying conversation there's no course/video
  // mapping yet — we drop the recording into <org_id>/inbox/ and let
  // the PM associate it with a video via the recording dashboard.
  const ext = file.file_type.toLowerCase();
  const storagePath = `${cred.org_id}/inbox/${payload.object.uuid}.${ext}`;
  await sb.storage.from("recordings").upload(storagePath, Buffer.from(buf), {
    contentType: file.file_type === "MP4" ? "video/mp4" : "audio/m4a",
    upsert: true,
  });

  // Insert a recordings row with no video_id yet — PM will link it.
  await sb.from("recordings").insert({
    org_id: cred.org_id,
    course_id: null,    // unassigned
    lesson_id: null,
    video_id: null,
    recording_type: "zoom",
    audio_url: storagePath,
    duration_seconds: payload.object.duration ? payload.object.duration * 60 : null,
    status: "uploaded",
  });
}

function hashShort(s: string): string {
  // tiny stable hash — collision-resistant enough for a per-event id
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
