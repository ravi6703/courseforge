// /api/ppt/by-video/[videoId]/rewrite
//
// Rewrites every existing ppt_slides row for a video given a coach instruction
// (e.g. "more punchy", "more academic"). Different from /api/ppt/[id]/rewrite
// which works off an uploaded .pptx — this one operates on already-generated
// slides, which is what the tracker grid offers.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode, hasAIProvider } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SlideRow {
  id: string;
  slide_number: number;
  title: string;
  content: unknown;
  speaker_notes: string | null;
  layout_type: string;
}

async function rewriteWithClaude(slides: SlideRow[], instructions: string): Promise<SlideRow[]> {
  const prompt = `You are an expert instructional designer. Rewrite each slide per the coach's instruction. Keep slide_number, layout_type, and structure. Return ONLY a JSON array with the same length, in order: [{ "slide_number", "title", "content", "speaker_notes" }].

Instruction: ${instructions}

Slides:
${JSON.stringify(slides.map((s) => ({ slide_number: s.slide_number, title: s.title, content: s.content, speaker_notes: s.speaker_notes })), null, 2)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("Claude returned no JSON array");
  const rewritten = JSON.parse(m[0]) as Array<{ slide_number: number; title: string; content: unknown; speaker_notes?: string }>;
  return slides.map((s) => {
    const r = rewritten.find((x) => x.slide_number === s.slide_number);
    return r ? { ...s, title: r.title ?? s.title, content: r.content ?? s.content, speaker_notes: r.speaker_notes ?? s.speaker_notes } : s;
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ videoId: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "ppt-rewrite-by-video", { perMinute: 5, perDay: 50 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const { videoId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const instructions: string = ((body.instructions as string) ?? "").trim();
  if (!instructions) return NextResponse.json({ error: "instructions required" }, { status: 400 });
  if (instructions.length > 500) return NextResponse.json({ error: "instructions too long" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data: video } = await sb.from("videos").select("id, course_id, org_id").eq("id", videoId).maybeSingle();
  if (!video || video.org_id !== auth.orgId) return NextResponse.json({ error: "video not found" }, { status: 404 });

  const { data: slides } = await sb
    .from("ppt_slides")
    .select("id, slide_number, title, content, speaker_notes, layout_type")
    .eq("video_id", videoId)
    .order("slide_number", { ascending: true });
  if (!slides || slides.length === 0) {
    return NextResponse.json({ error: "no slides to rewrite for this video" }, { status: 404 });
  }

  let next: SlideRow[];
  try {
    next = hasAIProvider() ? await rewriteWithClaude(slides as SlideRow[], instructions) : (slides as SlideRow[]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502, headers: aiHeaders(aiMode()) });
  }

  // Single bulk update
  for (const s of next) {
    await sb.from("ppt_slides").update({
      title: s.title.slice(0, 200),
      content: s.content,
      speaker_notes: s.speaker_notes ?? "",
    }).eq("id", s.id);
  }

  return NextResponse.json({ success: true, count: next.length }, { headers: aiHeaders(aiMode()) });
}
