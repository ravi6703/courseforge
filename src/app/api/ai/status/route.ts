// src/app/api/ai/status/route.ts
//
// Cheap probe used by the AIFallbackBanner to decide whether to display.

import { NextResponse } from "next/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const mode = aiMode();
  return NextResponse.json(
    { mode },
    { status: 200, headers: aiHeaders(mode) }
  );
}
