// GET /api/transcript/[id]/sync-diff
//
// Compares the transcript text to the slide-deck speaker_notes for the
// same video. Surfaces lines that drifted (the speaker said something
// not in the script) so the coach can decide: update the script or
// re-record.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: tr } = await sb
    .from("transcripts")
    .select("id, video_id, text_content")
    .eq("id", id)
    .maybeSingle();
  if (!tr) return NextResponse.json({ error: "transcript not found" }, { status: 404 });

  const { data: slides } = await sb
    .from("ppt_slides")
    .select("speaker_notes, slide_number")
    .eq("video_id", tr.video_id)
    .order("slide_number", { ascending: true });

  const scriptText = (slides ?? [])
    .map((s) => s.speaker_notes ?? "")
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const transcriptText = (tr.text_content ?? "").toLowerCase();

  // Sentence-level diff: split each side into sentences, find sentences
  // in the transcript that don't match anything in the script (token-overlap).
  const trSentences = sentences(transcriptText);
  const scriptSentences = sentences(scriptText);

  const drifts: Array<{ kind: "improvised" | "missing"; text: string }> = [];

  trSentences.forEach((s) => {
    if (s.length < 30) return;
    const sim = trSentences.length === 0 ? 0 : maxSimilarity(s, scriptSentences);
    if (sim < 0.4) drifts.push({ kind: "improvised", text: s });
  });
  scriptSentences.forEach((s) => {
    if (s.length < 30) return;
    const sim = maxSimilarity(s, trSentences);
    if (sim < 0.4) drifts.push({ kind: "missing", text: s });
  });

  // Keep first 12 of each kind to avoid wall-of-text.
  const improvised = drifts.filter((d) => d.kind === "improvised").slice(0, 12);
  const missing    = drifts.filter((d) => d.kind === "missing").slice(0, 12);

  return NextResponse.json({
    summary: {
      improvised: improvised.length,
      missing: missing.length,
      scriptSentenceCount: scriptSentences.length,
      transcriptSentenceCount: trSentences.length,
    },
    improvised,
    missing,
  });
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
function tokens(s: string): Set<string> {
  return new Set(s.split(/\W+/).filter((w) => w.length >= 3));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((x) => { if (b.has(x)) inter++; });
  return inter / new Set([...a, ...b]).size;
}
function maxSimilarity(needle: string, haystack: string[]): number {
  const t = tokens(needle);
  let max = 0;
  for (const s of haystack) {
    const sim = jaccard(t, tokens(s));
    if (sim > max) max = sim;
    if (max >= 0.9) break;
  }
  return max;
}
