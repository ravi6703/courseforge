// /api/transcript/[id]/diarize
//
// Run speaker diarization over the recording associated with a transcript.
// Uses AssemblyAI when ASSEMBLYAI_API_KEY is set; otherwise returns a
// single-speaker placeholder so the UI keeps working.
//
// Result is stored on transcripts.segments[] as `speaker` per segment so
// downstream renderers can label "Speaker 1: …" / "Speaker 2: …".

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { captureException } from "@/lib/observability/sentry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AssemblyUtterance {
  speaker: string;
  start: number; // ms
  end: number;
  text: string;
  confidence: number;
}

async function diarizeWithAssemblyAI(audioUrl: string): Promise<AssemblyUtterance[]> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY not set");

  // Submit job
  const submit = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { "Authorization": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      format_text: true,
    }),
  });
  if (!submit.ok) throw new Error(`AssemblyAI submit ${submit.status}`);
  const submitted = await submit.json();
  const id: string = submitted.id;

  // Poll for completion (max ~10 minutes; transcripts of typical lectures
  // come back in ~1× realtime).
  const start = Date.now();
  while (Date.now() - start < 10 * 60_000) {
    await new Promise((r) => setTimeout(r, 5_000));
    const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { "Authorization": key },
    });
    if (!poll.ok) throw new Error(`AssemblyAI poll ${poll.status}`);
    const data = await poll.json();
    if (data.status === "completed") return data.utterances ?? [];
    if (data.status === "error")     throw new Error(`AssemblyAI: ${data.error}`);
  }
  throw new Error("AssemblyAI timeout");
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "diarize", { perMinute: 2, perDay: 30 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const { id } = await ctx.params;

  const sb = await getServerSupabase();
  const { data: t } = await sb.from("transcripts")
    .select("id, recording_id, segments, org_id")
    .eq("id", id).maybeSingle();
  if (!t || t.org_id !== auth.orgId) return NextResponse.json({ error: "transcript not found" }, { status: 404 });

  // Resolve audio_url from the recording (where the URL actually lives).
  const { data: rec } = await sb.from("recordings")
    .select("audio_url, video_url")
    .eq("id", t.recording_id).maybeSingle();
  const audioUrl = rec?.audio_url || rec?.video_url;
  if (!audioUrl) return NextResponse.json({ error: "no audio URL on recording" }, { status: 400 });

  if (!process.env.ASSEMBLYAI_API_KEY) {
    // Fallback: tag every existing segment as "Speaker 1" so UI still
    // renders something. Operators add ASSEMBLYAI_API_KEY to enable real
    // diarization.
    const tagged = ((t.segments as Array<{ start: number; end: number; text: string }> | null) ?? [])
      .map((s) => ({ ...s, speaker: "Speaker 1" }));
    await sb.from("transcripts").update({ segments: tagged }).eq("id", id);
    return NextResponse.json({
      ok: true,
      speakers: 1,
      mode: "fallback",
      hint: "Set ASSEMBLYAI_API_KEY to enable real speaker diarization.",
    }, { headers: aiHeaders(aiMode(), "fallback") });
  }

  try {
    const utterances = await diarizeWithAssemblyAI(audioUrl);
    const segments = utterances.map((u) => ({
      start: u.start / 1000,
      end:   u.end   / 1000,
      text:  u.text,
      speaker: `Speaker ${u.speaker}`,
    }));
    const speakers = new Set(utterances.map((u) => u.speaker)).size;
    await sb.from("transcripts").update({ segments }).eq("id", id);
    return NextResponse.json({ ok: true, speakers, mode: "live" });
  } catch (e) {
    await captureException(e, { source: "api/transcript/diarize", tags: { org: auth.orgId, transcript: id } });
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
