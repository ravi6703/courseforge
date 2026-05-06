// API: POST /api/transcript/[id]/asset?kind=blog|captions|summary|quiz|study_guide|clips|pdf_notes
//
// One-click generators that turn a transcript into a non-video asset.
// These write into content_items with the appropriate kind so the Content
// tab picks them up automatically.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Kind = "blog" | "captions" | "summary" | "quiz" | "study_guide" | "clips" | "pdf_notes";

const KIND_TO_CONTENT: Record<Kind, { ci_kind: string; title: string }> = {
  blog:        { ci_kind: "blog",        title: "Blog post" },
  captions:    { ci_kind: "captions",    title: "Captions (SRT)" },
  summary:     { ci_kind: "summary",     title: "Summary" },
  quiz:        { ci_kind: "pq",          title: "Practice quiz" },
  study_guide: { ci_kind: "reading",     title: "Study guide" },
  clips:       { ci_kind: "clips",       title: "Social clips" },
  pdf_notes:   { ci_kind: "pdf_notes",   title: "PDF notes" },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: transcriptId } = await params;
  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") ?? "summary") as Kind;
  if (!KIND_TO_CONTENT[kind]) {
    return NextResponse.json({ error: `Unknown kind: ${kind}` }, { status: 400 });
  }

  const sb = await getServerSupabase();

  const { data: t } = await sb
    .from("transcripts")
    .select("id, course_id, video_id, lesson_id, text_content")
    .eq("id", transcriptId)
    .maybeSingle();
  if (!t) return NextResponse.json({ error: "transcript not found" }, { status: 404 });

  // The actual AI call lives behind a separate worker — for now we stub a
  // pending content_item that downstream generators populate. This makes
  // the Content tab show "X assets ready to generate" in real time.
  const meta = KIND_TO_CONTENT[kind];
  const { data: existing } = await sb
    .from("content_items")
    .select("id")
    .eq("course_id", t.course_id)
    .eq("lesson_id", t.lesson_id)
    .eq("kind", meta.ci_kind)
    .maybeSingle();

  if (existing?.id) {
    await sb.from("content_items")
      .update({
        status: "generating",
        content: { source_transcript_id: transcriptId },
      })
      .eq("id", existing.id);
    return NextResponse.json({ ok: true, contentItemId: existing.id, action: "queued" });
  }

  const { data: created, error } = await sb
    .from("content_items")
    .insert({
      course_id: t.course_id,
      lesson_id: t.lesson_id,
      kind: meta.ci_kind,
      title: meta.title,
      type: meta.ci_kind,
      status: "generating",
      content: { source_transcript_id: transcriptId, source_video_id: t.video_id },
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the course
  await sb.from("course_notifications").insert({
    course_id: t.course_id,
    kind: "asset_ready",
    severity: "info",
    title: `${meta.title} queued`,
    body: `Generating from transcript. Check the Content tab in ~30s.`,
    link: `/course/${t.course_id}/content`,
  });

  return NextResponse.json({ ok: true, contentItemId: created.id, action: "queued" });
}
