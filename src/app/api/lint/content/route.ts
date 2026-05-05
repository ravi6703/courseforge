// /api/lint/content — runs the per-artifact lint engine.
//
// GET ?content_item_id=…  → findings for that one item
// GET ?course_id=…        → findings for every artifact on that course

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { lintByKind, scoreFindings } from "@/lib/lint/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const itemId = url.searchParams.get("content_item_id");
  const courseId = url.searchParams.get("course_id");

  const supabase = await getServerSupabase();
  if (itemId) {
    const { data: item } = await supabase
      .from("content_items")
      .select("id, kind, payload, course_id, video_id")
      .eq("id", itemId)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    const findings = lintByKind(item.kind, item.payload as Record<string, unknown>);
    const score = scoreFindings(findings);
    return NextResponse.json({ item_id: item.id, kind: item.kind, score, findings });
  }

  if (courseId) {
    const { data: items } = await supabase
      .from("content_items")
      .select("id, kind, payload, video_id")
      .eq("course_id", courseId);
    const out = (items ?? []).map((it) => {
      const findings = lintByKind(it.kind, it.payload as Record<string, unknown>);
      return { item_id: it.id, video_id: it.video_id, kind: it.kind, findings, score: scoreFindings(findings) };
    });
    return NextResponse.json({ items: out });
  }

  return NextResponse.json({ error: "content_item_id or course_id required" }, { status: 400 });
}
