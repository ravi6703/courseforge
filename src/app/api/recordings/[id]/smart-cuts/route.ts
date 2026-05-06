// GET  /api/recordings/[id]/smart-cuts — analyze the linked transcript
//                                          for filler / restart / pause patterns.
// POST /api/recordings/[id]/smart-cuts — persist a chosen subset of cuts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SmartCut {
  id: string;
  startSec: number;
  endSec: number;
  reason: "filler" | "restart" | "long_pause";
  preview: string;
}

const FILLER_RE = /\b(um+|uh+|like|you know|sort of|kind of)\b/gi;
const RESTART_RE = /\b(let me try that again|let me start over|sorry,? scratch that|wait,? actually)\b/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: tr } = await sb
    .from("transcripts")
    .select("id, segments, text_content")
    .eq("recording_id", id)
    .maybeSingle();
  if (!tr) return NextResponse.json({ cuts: [], note: "No transcript yet" });

  const segments = Array.isArray(tr.segments) ? (tr.segments as Array<{ start: number; end: number; text: string }>) : [];
  const cuts: SmartCut[] = [];

  segments.forEach((s, i) => {
    const text = (s.text ?? "").trim();
    const startSec = Number(s.start ?? 0);
    const endSec = Number(s.end ?? startSec);

    // Filler density >= 2 in a single segment → cut.
    const fillerHits = text.match(FILLER_RE)?.length ?? 0;
    if (fillerHits >= 2) {
      cuts.push({
        id: `f-${i}`,
        startSec, endSec,
        reason: "filler",
        preview: text,
      });
    }
    // Restart phrase → cut from previous segment too.
    if (RESTART_RE.test(text)) {
      const prev = segments[i - 1];
      const cutStart = prev ? Number(prev.start ?? startSec) : startSec;
      cuts.push({
        id: `r-${i}`,
        startSec: cutStart,
        endSec,
        reason: "restart",
        preview: text,
      });
    }
    // Long pause: gap to next segment > 2s.
    const next = segments[i + 1];
    if (next) {
      const gap = Number(next.start ?? endSec) - endSec;
      if (gap > 2.5) {
        cuts.push({
          id: `p-${i}`,
          startSec: endSec,
          endSec: endSec + gap,
          reason: "long_pause",
          preview: `~${gap.toFixed(1)}s pause between “${text.slice(-40)}” and “${(next.text ?? "").slice(0, 40)}”`,
        });
      }
    }
  });

  return NextResponse.json({ cuts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cuts = (body.cuts ?? []) as SmartCut[];
  const sb = await getServerSupabase();
  const { error } = await sb.from("recordings").update({ smart_cuts: cuts }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: cuts.length });
}
