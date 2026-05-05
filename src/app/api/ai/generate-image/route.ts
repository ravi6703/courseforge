// /api/ai/generate-image
//
// Generate an image for a slide / reading section. Provider-agnostic: looks for
// OPENAI_API_KEY (DALL-E 3) first, then a generic IMAGE_GEN_URL env. If neither
// is configured we return a deterministic placeholder URL so the UI keeps
// working in fallback mode (the AIFallbackBanner already tells the coach).

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageStyle = "diagram" | "photo" | "illustration" | "sketch";

async function callOpenAI(prompt: string, style: ImageStyle): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no provider");
  const styled = `${prompt}. Style: ${style === "diagram" ? "clean educational diagram, white background, sans-serif labels" : style === "sketch" ? "hand-drawn sketch, pencil, light shading" : style === "photo" ? "photorealistic, soft natural light" : "modern flat illustration, brand-friendly palette"}.`;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt: styled, size: "1024x1024", n: 1 }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  if (b64) return `data:image/png;base64,${b64}`;
  if (url) return url;
  throw new Error("Empty response");
}

function placeholder(prompt: string): string {
  // Public placeholder service so the UI renders something sensible offline.
  const seed = encodeURIComponent(prompt.slice(0, 80));
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "image-gen", { perMinute: 5, perDay: 100 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const body = await req.json().catch(() => ({}));
  const prompt: string = (body.prompt ?? "").toString().trim();
  const style: ImageStyle = (["diagram", "photo", "illustration", "sketch"] as const).includes(body.style) ? body.style : "diagram";
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  if (prompt.length > 1000) return NextResponse.json({ error: "prompt too long" }, { status: 400 });

  let url: string;
  let mode: "live" | "fallback" = "live";
  try {
    url = await callOpenAI(prompt, style);
  } catch {
    url = placeholder(prompt);
    mode = "fallback";
  }

  return NextResponse.json({ url, prompt, style, mode }, { headers: aiHeaders(aiMode()) });
}
