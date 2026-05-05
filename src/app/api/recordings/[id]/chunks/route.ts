// /api/recordings/[id]/chunks
//
// Manages the chunk play-list for a recording. Each chunk is an
// independently-uploaded audio file in Supabase Storage; the recording's
// audio_url becomes a JSON manifest pointing at chunks in `chunk_order`.
// Players (our viewer / Coursera) play them sequentially.
//
// We don't run ffmpeg-concat here — that's deferred to a worker; for the
// editor flow what matters is "swap chunk 3 with a re-recorded version"
// which this route supports natively via PATCH (mark a new chunk as
// is_replacement and shift order).
//
// Verbs:
//   GET   list all chunks for a recording (ordered)
//   POST  add a chunk { audio_url, storage_path?, duration_seconds?, chunk_order? }
//   PATCH replace chunk at order N with a new audio_url
//   DELETE ?chunkId=…
//
// Upload flow on the client:
//   1. POST /api/upload/recording/sign with mime+size  → signed URL
//   2. PUT the chunk to that signed URL
//   3. POST /api/recordings/[id]/chunks { audio_url } to register

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownership(recordingId: string, orgId: string) {
  const sb = await getServerSupabase();
  const { data } = await sb.from("recordings").select("id, course_id, org_id").eq("id", recordingId).maybeSingle();
  if (!data || data.org_id !== orgId) return null;
  return { sb, recording: data };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "recording not found" }, { status: 404 });

  const { data } = await own.sb.from("recording_chunks")
    .select("id, chunk_order, audio_url, storage_path, duration_seconds, is_replacement, created_at")
    .eq("recording_id", id)
    .order("chunk_order", { ascending: true });
  return NextResponse.json({ chunks: data ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "recording not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const audio_url: string = body.audio_url;
  if (!audio_url || typeof audio_url !== "string") {
    return NextResponse.json({ error: "audio_url required" }, { status: 400 });
  }

  // Default new chunks to the next available order.
  let chunk_order: number = body.chunk_order;
  if (typeof chunk_order !== "number") {
    const { data: existing } = await own.sb.from("recording_chunks")
      .select("chunk_order").eq("recording_id", id).order("chunk_order", { ascending: false }).limit(1);
    chunk_order = (existing?.[0]?.chunk_order ?? -1) + 1;
  }

  const { data, error } = await own.sb.from("recording_chunks").insert({
    org_id:           auth.orgId,
    course_id:        own.recording.course_id,
    recording_id:     id,
    chunk_order,
    audio_url,
    storage_path:     body.storage_path ?? null,
    duration_seconds: typeof body.duration_seconds === "number" ? body.duration_seconds : null,
    is_replacement:   Boolean(body.is_replacement),
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Refresh the recording's audio_url to be a JSON manifest pointing at
  // every chunk, in order. Players that don't understand chunked playback
  // can still fall back to fetching the JSON and stitching client-side.
  const { data: chunks } = await own.sb.from("recording_chunks")
    .select("chunk_order, audio_url, duration_seconds")
    .eq("recording_id", id)
    .order("chunk_order", { ascending: true });
  const manifest = JSON.stringify({
    type: "courseforge.chunked.audio",
    version: 1,
    chunks: (chunks ?? []).map((c) => ({ url: c.audio_url, duration: c.duration_seconds ?? null })),
  });
  await own.sb.from("recordings")
    .update({ audio_url: `data:application/json;base64,${Buffer.from(manifest).toString("base64")}` })
    .eq("id", id);

  return NextResponse.json({ ok: true, chunk: data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "recording not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const chunkId: string = body.chunkId;
  const audio_url: string | undefined = body.audio_url;
  if (!chunkId) return NextResponse.json({ error: "chunkId required" }, { status: 400 });

  const fields: Record<string, unknown> = {};
  if (typeof audio_url === "string") {
    fields.audio_url = audio_url;
    fields.is_replacement = true;
  }
  if (typeof body.chunk_order === "number")     fields.chunk_order = body.chunk_order;
  if (typeof body.storage_path === "string")    fields.storage_path = body.storage_path;
  if (typeof body.duration_seconds === "number") fields.duration_seconds = body.duration_seconds;
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: "no fields" }, { status: 400 });

  const { error } = await own.sb.from("recording_chunks")
    .update(fields).eq("id", chunkId).eq("recording_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const own = await ownership(id, auth.orgId);
  if (!own) return NextResponse.json({ error: "recording not found" }, { status: 404 });

  const url = new URL(req.url);
  const chunkId = url.searchParams.get("chunkId");
  if (!chunkId) return NextResponse.json({ error: "chunkId required" }, { status: 400 });

  await own.sb.from("recording_chunks").delete().eq("id", chunkId).eq("recording_id", id);
  return NextResponse.json({ ok: true });
}
