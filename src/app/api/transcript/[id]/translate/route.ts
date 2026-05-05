// /api/transcript/[id]/translate
//
// Translate a transcript into another language using whichever AI provider
// the org / env points at (router decides). Posts back the translated text
// alongside the original — we don't overwrite text_content because the
// original is still the source-of-truth for downstream artifacts.
//
// Body: { target: "hi" | "es" | "ar" | <BCP-47> }
// Response: { translation: string, target: string, provider: string }

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { aiComplete } from "@/lib/ai/router";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { captureException } from "@/lib/observability/sentry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED = new Set([
  "hi", "es", "ar", "fr", "de", "pt", "ja", "zh", "ko", "ru", "id", "vi", "tr",
  "es-419", "en-IN", "en-GB",
]);

const NAMES: Record<string, string> = {
  hi: "Hindi", es: "Spanish", ar: "Arabic", fr: "French", de: "German",
  pt: "Portuguese", ja: "Japanese", zh: "Chinese (Simplified)", ko: "Korean",
  ru: "Russian", id: "Indonesian", vi: "Vietnamese", tr: "Turkish",
  "es-419": "Latin-American Spanish", "en-IN": "Indian English", "en-GB": "British English",
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  // Translation is comparatively expensive — cap to 5/min/200/day per org.
  const __rl = await checkRateLimit(auth.orgId, "translate", { perMinute: 5, perDay: 200 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const target: string = (body.target ?? "").toString().trim();
  if (!SUPPORTED.has(target)) {
    return NextResponse.json({ error: `target must be one of: ${[...SUPPORTED].join(", ")}` }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: t } = await sb.from("transcripts")
    .select("id, text_content, org_id")
    .eq("id", id)
    .maybeSingle();
  if (!t || t.org_id !== auth.orgId) {
    return NextResponse.json({ error: "transcript not found" }, { status: 404 });
  }

  const sourceText = (t.text_content as string ?? "").slice(0, 60000); // safety cap
  if (!sourceText) {
    return NextResponse.json({ error: "transcript has no text" }, { status: 400 });
  }

  const targetName = NAMES[target] ?? target;
  const sys = `You are a professional educational translator. Translate the user's transcript into ${targetName}. Preserve all paragraph breaks, technical terminology (translate concepts but keep widely-known acronyms), and the speaker's voice. Do not add commentary, do not summarize, do not interpret — output ONLY the translated transcript.`;

  try {
    const result = await aiComplete({
      orgId: auth.orgId,
      system: sys,
      user: sourceText,
      maxTokens: 8192,
      temperature: 0.2,
    });

    if (!result.text) {
      return NextResponse.json({ error: "AI returned empty translation" }, { status: 502, headers: aiHeaders(aiMode(), result.provider) });
    }

    return NextResponse.json({
      translation: result.text,
      target,
      target_name: targetName,
      provider: result.provider,
      model: result.model,
    }, { headers: aiHeaders(aiMode(), result.provider) });
  } catch (e) {
    await captureException(e, {
      source: "api/transcript/translate",
      tags: { org: auth.orgId, transcript: id, target },
    });
    return NextResponse.json({ error: (e as Error).message }, { status: 502, headers: aiHeaders(aiMode()) });
  }
}
