// POST /api/briefs/[videoId]/variants
//
// Generates 2 stylistic variants of a brief side-by-side and stores
// them in brief_variants. Coach picks one with PUT { picked: 'A'|'B' }
// which copies it to the canonical content_briefs row.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FORMATS_PAIR: Array<["A" | "B", string]> = [
  ["A", "example_driven"],
  ["B", "problem_solution"],
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  const sb = await getServerSupabase();

  const { data: brief } = await sb
    .from("content_briefs")
    .select("course_id, talking_points, key_takeaways, visual_cues, script_outline")
    .eq("video_id", videoId)
    .maybeSingle();
  if (!brief) return NextResponse.json({ error: "no brief to variant from" }, { status: 404 });

  // Wipe prior variants for clarity
  await sb.from("brief_variants").delete().eq("video_id", videoId);

  const variants = FORMATS_PAIR.map(([label, fmt]) => ({
    course_id: brief.course_id,
    video_id: videoId,
    variant_label: label,
    variant_format: fmt,
    payload: shape(brief, fmt),
  }));
  const { error } = await sb.from("brief_variants").insert(variants);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, variants: variants.map((v) => ({ label: v.variant_label, format: v.variant_format, payload: v.payload })) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  const body = await req.json().catch(() => ({}));
  const picked = body.picked as "A" | "B" | undefined;
  if (!picked) return NextResponse.json({ error: "picked required" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data: variant } = await sb
    .from("brief_variants")
    .select("payload, course_id")
    .eq("video_id", videoId)
    .eq("variant_label", picked)
    .maybeSingle();
  if (!variant) return NextResponse.json({ error: "variant not found" }, { status: 404 });

  await sb.from("content_briefs").update(variant.payload).eq("video_id", videoId);
  await sb.from("brief_variants").update({ picked: false }).eq("video_id", videoId);
  await sb.from("brief_variants").update({ picked: true }).eq("video_id", videoId).eq("variant_label", picked);

  return NextResponse.json({ ok: true });
}

function shape(brief: { talking_points: unknown; key_takeaways: unknown; visual_cues: unknown; script_outline: string | null }, format: string) {
  // Shaping happens client-side based on style; we keep the canonical
  // brief shape and tag the format so future AI regeneration knows.
  return {
    talking_points: brief.talking_points,
    visual_cues: brief.visual_cues,
    key_takeaways: brief.key_takeaways,
    script_outline: brief.script_outline,
    script_format: format,
  };
}
