// POST /api/transcript/[id]/auto-glossary
//
// Extracts likely domain terms from the transcript and stores them in
// glossary_entries (auto-source). Coach can promote entries to the
// course profile vocabulary's must_include list with a click.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STOPWORDS = new Set("the and you that have for with this from they are will not but what when where which there here also their these those over into with about because while just only such been being other where about which been your".split(" "));

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: tr } = await sb
    .from("transcripts")
    .select("id, course_id, text_content")
    .eq("id", id)
    .maybeSingle();
  if (!tr) return NextResponse.json({ error: "transcript not found" }, { status: 404 });

  const text = tr.text_content ?? "";
  const candidates = extractCandidates(text);

  // Don't blow away manual entries; upsert auto entries.
  const rows = candidates.map((term) => ({
    course_id: tr.course_id,
    term,
    definition: null,
    source: "auto" as const,
    source_transcript_id: tr.id,
  }));
  if (rows.length === 0) return NextResponse.json({ added: 0 });

  // Upsert by (course_id, term).
  for (const row of rows) {
    await sb.from("glossary_entries").upsert(row, { onConflict: "course_id,term" });
  }

  return NextResponse.json({ added: rows.length, terms: candidates });
}

// Heuristics:
//   - 1-3 word phrases that contain a capital letter or a hyphen
//   - 3-letter+ acronyms (≥2 uppercase chars in a row)
function extractCandidates(text: string): string[] {
  const out = new Set<string>();
  // ALL-CAPS acronyms (3+ chars)
  const acroRe = /\b[A-Z]{3,}\b/g;
  let m: RegExpExecArray | null;
  while ((m = acroRe.exec(text))) out.add(m[0]);

  // Capitalized 1-3 word phrases
  const phraseRe = /\b([A-Z][a-z]+(?:[ -][A-Z][a-z]+){0,2})\b/g;
  while ((m = phraseRe.exec(text))) {
    const phrase = m[1];
    const first = phrase.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (STOPWORDS.has(first)) continue;
    if (phrase.length < 4) continue;
    out.add(phrase);
  }
  // Hyphenated technical terms
  const hyphenRe = /\b([a-z][a-z]+(?:-[a-z]+){1,3})\b/g;
  while ((m = hyphenRe.exec(text))) {
    if (m[1].length >= 6) out.add(m[1]);
  }

  return Array.from(out).slice(0, 40);
}
