// /api/transcript/[id]/glossary
//
// Extracts a glossary of domain terms from the transcript. AI-assisted when
// available; falls back to a frequency-based capitalized-term extractor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { hasAIProvider, aiHeaders, aiMode } from "@/lib/ai/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GlossaryEntry {
  term: string;
  definition: string;
}

function deterministic(text: string): GlossaryEntry[] {
  const stop = new Set(["The", "This", "That", "These", "And", "But", "Or", "If", "When", "While", "We", "You", "I"]);
  const counts = new Map<string, number>();
  const re = /\b[A-Z][A-Za-z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+)?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const term = m[0].trim();
    if (stop.has(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([term]) => ({ term, definition: "(no AI provider configured — definition pending)" }));
}

async function aiGlossary(text: string): Promise<GlossaryEntry[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "Extract a glossary from a course transcript. Return strictly: { glossary: [{ term, definition }] }. Pick 8-15 domain terms. Define each in one learner-friendly sentence. No preface.",
      messages: [{ role: "user", content: text.slice(0, 40000) }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  const txt: string = data.content?.[0]?.text ?? "";
  const match = txt.match(/\{[\s\S]*\}/);
  if (!match) return [];
  const parsed = JSON.parse(match[0]) as { glossary: GlossaryEntry[] };
  return parsed.glossary ?? [];
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const sb = await getServerSupabase();
  const { data: t } = await sb.from("transcripts").select("id, text_content, org_id").eq("id", id).maybeSingle();
  if (!t || t.org_id !== auth.orgId) return NextResponse.json({ error: "not found" }, { status: 404 });

  let glossary: GlossaryEntry[];
  try {
    glossary = hasAIProvider() ? await aiGlossary(t.text_content) : deterministic(t.text_content);
  } catch {
    glossary = deterministic(t.text_content);
  }

  return NextResponse.json({ glossary }, { headers: aiHeaders(aiMode()) });
}
