// /api/transcript/[id]/cleanup
//
// Cleans up a Whisper-style transcript: removes filler words, normalizes
// punctuation, reflows paragraphs by speaker pause boundaries. AI-assisted
// when ANTHROPIC_API_KEY is set; deterministic regex fallback otherwise.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { hasAIProvider, aiHeaders, aiMode } from "@/lib/ai/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILLERS = ["um", "uh", "you know", "like,", "sort of", "kind of", "i mean,", "so,", "right,"];

function deterministicCleanup(raw: string): string {
  let s = raw;
  for (const w of FILLERS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "gi");
    s = s.replace(re, "");
  }
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/\s+([,.!?;:])/g, "$1");
  s = s.replace(/(?<=[.!?])\s+/g, "\n\n");
  return s.trim();
}

async function aiCleanup(raw: string): Promise<string> {
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
      system: "You clean up speech-to-text transcripts. Remove disfluencies (um, uh, you know, like). Fix obvious mis-hearings only when context makes them obvious. Normalize punctuation. Break into readable paragraphs by speaker pause / topic shift. Preserve meaning. Output ONLY the cleaned transcript text — no preface, no commentary.",
      messages: [{ role: "user", content: raw.slice(0, 60000) }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? raw).trim();
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const sb = await getServerSupabase();
  const { data: t } = await sb.from("transcripts").select("id, text_content, course_id, org_id").eq("id", id).maybeSingle();
  if (!t || t.org_id !== auth.orgId) return NextResponse.json({ error: "not found" }, { status: 404 });

  let cleaned: string;
  try {
    cleaned = hasAIProvider() ? await aiCleanup(t.text_content) : deterministicCleanup(t.text_content);
  } catch {
    cleaned = deterministicCleanup(t.text_content);
  }

  await sb.from("transcripts").update({ text_content: cleaned, status: "edited" }).eq("id", id);
  return NextResponse.json({ ok: true, length: cleaned.length }, { headers: aiHeaders(aiMode()) });
}
