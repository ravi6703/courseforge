// POST /api/ai/approve-brief  { videoId, courseId }
//
// Phase 1 — sets brief status to 'approved' so the PPT Tracker un-hides
// this video. PM-only (coaches can edit but not approve, mirroring the
// PRD: PMs are the quality gatekeepers).

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: { videoId: string; courseId: string; status?: "approved" | "draft" };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.videoId || !body.courseId) {
    return NextResponse.json({ error: "videoId and courseId required" }, { status: 400 });
  }

  const sb = await getServerSupabase();
  const { data: course } = await sb.from("courses").select("org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  // PMs only — coaches can edit briefs but not flip approval.
  if (auth.role !== "pm") {
    return NextResponse.json({ error: "Only PMs can approve briefs" }, { status: 403 });
  }

  const status = body.status === "draft" ? "draft" : "approved";
  const { error } = await sb
    .from("content_briefs")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: status === "approved" ? auth.profileId : null,
    })
    .eq("video_id", body.videoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordActivity(sb, {
    orgId: auth.orgId, userId: auth.profileId, userName: auth.email ?? undefined, userRole: auth.role,
    courseId: body.courseId,
    action: status === "approved" ? "brief.approved" : "brief.unapproved",
    targetType: "video",
    targetId: body.videoId,
    details: {},
  });

  return NextResponse.json({ ok: true, status });
}
