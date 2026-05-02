// POST /api/recordings/[id]/link  { course_id, lesson_id?, video_id? }
// Link an inbox recording to a course/lesson/video.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { course_id, lesson_id, video_id } = body as { course_id?: string; lesson_id?: string; video_id?: string };
  if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data: courseRow } = await sb.from("courses").select("org_id").eq("id", course_id).maybeSingle();
  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const { error } = await sb.from("recordings").update({
    course_id, lesson_id: lesson_id ?? null, video_id: video_id ?? null, status: "ready",
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordActivity(sb, {
    orgId: auth.orgId, userId: auth.profileId, userName: auth.email ?? undefined,
    userRole: auth.role, courseId: course_id,
    action: "recording.linked",
    targetType: "recording", targetId: id,
    details: { lesson_id, video_id },
  });

  return NextResponse.json({ ok: true });
}
