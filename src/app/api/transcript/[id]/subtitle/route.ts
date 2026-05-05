// /api/transcript/[id]/subtitle?format=srt|vtt
//
// Streams a subtitle file built from the transcript's segments[]. The
// transcribe pipeline already stores per-segment timestamps (start, end,
// text) in transcripts.segments — we just format them out.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Segment { start: number; end: number; text: string }

function fmtSrtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}
function fmtVttTime(s: number): string { return fmtSrtTime(s).replace(",", "."); }

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const fmt = (new URL(req.url).searchParams.get("format") ?? "srt").toLowerCase();
  if (!["srt", "vtt"].includes(fmt)) {
    return NextResponse.json({ error: "format must be srt or vtt" }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: t } = await sb.from("transcripts").select("id, segments, org_id").eq("id", id).maybeSingle();
  if (!t || t.org_id !== auth.orgId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const segs = ((t.segments as Segment[] | null) ?? []);
  if (segs.length === 0) {
    return NextResponse.json({ error: "transcript has no segments" }, { status: 400 });
  }

  let body: string;
  if (fmt === "srt") {
    body = segs.map((s, i) =>
      `${i + 1}\n${fmtSrtTime(s.start)} --> ${fmtSrtTime(s.end)}\n${s.text.trim()}\n`
    ).join("\n");
  } else {
    body = "WEBVTT\n\n" + segs.map((s) =>
      `${fmtVttTime(s.start)} --> ${fmtVttTime(s.end)}\n${s.text.trim()}\n`
    ).join("\n");
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": fmt === "srt" ? "application/x-subrip; charset=utf-8" : "text/vtt; charset=utf-8",
      "Content-Disposition": `attachment; filename="transcript-${id}.${fmt}"`,
    },
  });
}
