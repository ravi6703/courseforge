// POST /api/ppts/slides/[id]/visual
//
// Generates a diagram/image for a slide using the brief's visual_cues
// or a coach-provided prompt. Wraps the existing /api/ai/generate-image.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cuePrompt = body.prompt as string | undefined;

  const sb = await getServerSupabase();
  const { data: slide } = await sb
    .from("ppt_slides")
    .select("title, video_id, content")
    .eq("id", id)
    .maybeSingle();
  if (!slide) return NextResponse.json({ error: "slide not found" }, { status: 404 });

  // Resolve a prompt from brief.visual_cues if not explicitly provided.
  let prompt = cuePrompt;
  if (!prompt) {
    const { data: brief } = await sb
      .from("content_briefs")
      .select("visual_cues")
      .eq("video_id", slide.video_id)
      .maybeSingle();
    const cues = Array.isArray(brief?.visual_cues) ? brief?.visual_cues : [];
    prompt = (cues[0] as string | undefined) ?? slide.title;
  }

  // Delegate to the existing image-generation endpoint.
  const r = await fetch(new URL("/api/ai/generate-image", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body: JSON.stringify({ prompt: `${prompt} — clean educational diagram, white background`, style: "diagram" }),
  });
  if (!r.ok) return NextResponse.json({ error: `image gen HTTP ${r.status}` }, { status: 500 });
  const j = await r.json();
  if (!j.url) return NextResponse.json({ error: "no image url" }, { status: 500 });

  await sb.from("ppt_slides").update({ image_url: j.url }).eq("id", id);
  return NextResponse.json({ ok: true, url: j.url, prompt });
}
