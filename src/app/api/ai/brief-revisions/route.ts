// GET /api/ai/brief-revisions?videoId=...&courseId=...
//
// Phase 3 R9 — returns the approval history for a brief. UI uses this
// to show "you previously approved version N on YYYY-MM-DD" + diff.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const videoId = url.searchParams.get("videoId");
  const courseId = url.searchParams.get("courseId");
  if (!videoId || !courseId) {
    return NextResponse.json({ error: "videoId and courseId required" }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: course } = await sb.from("courses").select("org_id").eq("id", courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const { data, error } = await sb
    .from("brief_revisions")
    .select("id, revision_number, approved_at, approved_by, talking_points, visual_cues, key_takeaways, script_outline")
    .eq("video_id", videoId)
    .order("revision_number", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revisions: data ?? [], count: (data ?? []).length });
}
