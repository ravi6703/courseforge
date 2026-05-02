// POST /api/ppt/[id]/rewrite
//
// Phase 6 — AI rewrite of an uploaded PPT's text. Reads the slide_text
// JSON from the ppt_uploads row, asks Claude to improve title +
// bullets per slide, and writes the result back as ppt_slides rows for
// the linked video. Original .pptx in storage stays canonical.
//
// Request body: optional { instructions?: string } — coach-supplied
// guidance like "shorten bullets to one line each" or "make examples
// more enterprise".

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { recordActivity } from "@/lib/activity";
import { logger, requestId } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SlideIn { slide_number: number; title: string; bullets: string[]; notes: string }
interface SlideOut extends SlideIn { speaker_notes: string }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const log = logger("api/ppt/rewrite").child({ req: requestId(), org: auth.orgId });

  const __rl = await checkRateLimit(auth.orgId, "ppt-rewrite", { perMinute: 5, perDay: 50 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const { id: uploadId } = await params;
  const body = await req.json().catch(() => ({}));
  const instructions: string = (body?.instructions as string) ?? "";

  const sb = await getServerSupabase();

  // Mark as running so the UI can show a spinner.
  await sb.from("ppt_uploads").update({ rewrite_status: "running", rewrite_error: null }).eq("id", uploadId);

  const { data: row, error: rowErr } = await sb
    .from("ppt_uploads")
    .select("id, course_id, video_id, slide_text")
    .eq("id", uploadId)
    .maybeSingle();
  if (rowErr || !row) {
    log.warn({ uploadId }, "upload not found");
    return NextResponse.json({ error: "upload not found" }, { status: 404 });
  }

  const slidesIn: SlideIn[] = Array.isArray(row.slide_text) ? row.slide_text : [];
  if (!slidesIn.length) {
    await sb.from("ppt_uploads").update({ rewrite_status: "error", rewrite_error: "no slides parsed" }).eq("id", uploadId);
    return NextResponse.json({ error: "no slides to rewrite" }, { status: 400 });
  }

  let slidesOut: SlideOut[];
  try {
    slidesOut = process.env.ANTHROPIC_API_KEY
      ? await rewriteWithClaude(slidesIn, instructions)
      : fallbackRewrite(slidesIn);
  } catch (e) {
    log.error({ err: e }, "rewrite failed");
    await sb.from("ppt_uploads").update({ rewrite_status: "error", rewrite_error: (e as Error).message }).eq("id", uploadId);
    return NextResponse.json({ error: "rewrite failed" }, { status: 500 });
  }

  // Replace the ppt_slides rows for this video with the rewritten ones.
  await sb.from("ppt_slides").delete().eq("video_id", row.video_id);
  const slideRows = slidesOut.map((s) => ({
    org_id: auth.orgId,
    course_id: row.course_id,
    video_id: row.video_id,
    slide_number: s.slide_number,
    title: s.title.slice(0, 200),
    content: s.bullets,
    speaker_notes: s.speaker_notes ?? "",
    layout_type: s.slide_number === 1 ? "title" : "content",
    template_used: "ai-rewrite",
    status: "generated",
  }));
  if (slideRows.length) await sb.from("ppt_slides").insert(slideRows);

  await sb.from("ppt_uploads").update({ rewrite_status: "complete" }).eq("id", uploadId);

  await recordActivity(sb, {
    orgId: auth.orgId,
    userId: auth.profileId,
    userName: auth.email ?? undefined,
    userRole: auth.role,
    courseId: row.course_id,
    action: "ppt.rewritten",
    targetType: "video",
    targetId: row.video_id,
    details: { slide_count: slidesOut.length, hadInstructions: !!instructions },
  });

  return NextResponse.json({ success: true, slides: slidesOut }, { headers: aiHeaders(aiMode()) });
}

async function rewriteWithClaude(slides: SlideIn[], instructions: string): Promise<SlideOut[]> {
  const prompt = `You are an expert instructional designer. The following slide outline was extracted from a PowerPoint deck. Rewrite each slide to be tighter, clearer, and more pedagogically effective. Add concise speaker notes (2-3 sentences) for each slide.

${instructions ? `Coach guidance: ${instructions}\n\n` : ""}
Original slides (JSON):
${JSON.stringify(slides, null, 2)}

Return ONLY a JSON array of objects, one per slide, in the same order, with this shape:
{ "slide_number": number, "title": string, "bullets": string[], "notes": string, "speaker_notes": string }`;

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
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("Claude returned no JSON array");
  return JSON.parse(m[0]) as SlideOut[];
}

function fallbackRewrite(slides: SlideIn[]): SlideOut[] {
  // Lightweight fallback so the route works without an API key. We just
  // tighten obvious issues (max 5 bullets, capitalised title) so the
  // surface still does *something* useful.
  return slides.map((s) => ({
    ...s,
    title: titleCase(s.title),
    bullets: s.bullets.slice(0, 5),
    speaker_notes: s.notes || `Speaker notes for: ${s.title}`,
  }));
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}
