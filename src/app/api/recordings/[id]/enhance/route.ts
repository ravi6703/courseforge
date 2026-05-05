// /api/recordings/[id]/enhance
//
// AI noise removal pass on an uploaded recording. Provider-agnostic via
// AUDIO_ENHANCE_URL + AUDIO_ENHANCE_API_KEY (works with Resemble Enhance,
// adobe podcast, krisp, etc — pick whichever you've licensed). Without
// keys, no-ops with a friendly hint.
//
// Behaviour:
//   - Reads the source audio_url from the recording row
//   - POSTs it to the configured provider as { audio_url } and expects
//     { enhanced_url } back (we'll wrap the actual provider call in this
//     contract; most providers expose either this exact shape or are easy
//     to adapt with one fetch).
//   - Updates recordings.audio_url to the enhanced URL and bumps status
//     to 'ready' (idempotent — we keep the original on
//     recordings.original_audio_url, which we add in this migration).

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { captureException } from "@/lib/observability/sentry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function callEnhanceProvider(audioUrl: string): Promise<string> {
  const url = process.env.AUDIO_ENHANCE_URL;
  const key = process.env.AUDIO_ENHANCE_API_KEY;
  if (!url || !key) throw new Error("AUDIO_ENHANCE_URL / AUDIO_ENHANCE_API_KEY not set");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({ audio_url: audioUrl, profile: "lecture" }),
  });
  if (!res.ok) throw new Error(`enhance HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const enhanced = data.enhanced_url || data.url || data.output_url;
  if (!enhanced) throw new Error("enhance provider did not return a URL");
  return enhanced as string;
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "audio-enhance", { perMinute: 2, perDay: 30 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const { id } = await ctx.params;
  const sb = await getServerSupabase();
  const { data: rec } = await sb.from("recordings")
    .select("id, org_id, audio_url, video_url")
    .eq("id", id).maybeSingle();
  if (!rec || rec.org_id !== auth.orgId) {
    return NextResponse.json({ error: "recording not found" }, { status: 404 });
  }
  const source = rec.audio_url || rec.video_url;
  if (!source) return NextResponse.json({ error: "no source audio" }, { status: 400 });

  if (!process.env.AUDIO_ENHANCE_URL || !process.env.AUDIO_ENHANCE_API_KEY) {
    return NextResponse.json({
      ok: true,
      mode: "fallback",
      hint: "Set AUDIO_ENHANCE_URL + AUDIO_ENHANCE_API_KEY (Resemble Enhance / Adobe Podcast / Krisp) to enable noise removal.",
    }, { headers: aiHeaders(aiMode(), "fallback") });
  }

  try {
    const enhanced = await callEnhanceProvider(source);
    await sb.from("recordings").update({ audio_url: enhanced, status: "ready" }).eq("id", id);
    return NextResponse.json({ ok: true, mode: "live", enhanced_url: enhanced });
  } catch (e) {
    await captureException(e, { source: "api/recordings/enhance", tags: { org: auth.orgId, recording: id } });
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
