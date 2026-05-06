// POST /api/ppts/slides/[id]/from-speaker-notes
//
// Talk-first authoring: coach writes speaker notes; we extract a slide
// title and 3-5 bullets from them. No AI call here yet — heuristic
// extraction so the coach gets immediate feedback. Real AI rewriting
// is a future job for the cross-cutting generation queue.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const notes = String(body.speaker_notes ?? "");
  if (!notes.trim()) return NextResponse.json({ error: "speaker_notes required" }, { status: 400 });

  // Heuristic: first sentence → title; remaining sentences → bullets.
  // Cap to 5 bullets, max 18 words each.
  const sentences = notes
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const title = sentences[0]?.replace(/[.!?]+$/, "").slice(0, 80) || "New slide";
  const bullets = sentences.slice(1, 8).map((s) => {
    const words = s.split(/\s+/);
    if (words.length <= 18) return s.replace(/[.!?]+$/, "");
    return words.slice(0, 18).join(" ") + "…";
  }).slice(0, 5);

  const sb = await getServerSupabase();
  const { error } = await sb
    .from("ppt_slides")
    .update({
      title,
      content: bullets,
      speaker_notes: notes,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, title, bullets });
}
