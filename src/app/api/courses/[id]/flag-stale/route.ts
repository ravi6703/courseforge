// /api/courses/[id]/flag-stale
//
// Marks downstream artifacts stale after a TOC outcome edit. Scope can be
// "course" (everything), "module" (every brief/slide/content under that
// module's lessons → videos), or "lesson" (every brief/slide/content for
// that lesson's videos).
//
// Soft mark only — doesn't delete or rewrite anything. The Briefs / PPT /
// Content tabs render a "Stale" pill on each affected row with a
// "Regenerate" CTA.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id: courseId } = await ctx.params;

  const sb = await getServerSupabase();
  const { data: course } = await sb.from("courses").select("org_id").eq("id", courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const scope: "course" | "module" | "lesson" = body.scope;
  const targetId: string | undefined = body.targetId;
  if (!["course", "module", "lesson"].includes(scope)) {
    return NextResponse.json({ error: "scope must be course | module | lesson" }, { status: 400 });
  }
  if (scope !== "course" && !targetId) {
    return NextResponse.json({ error: "targetId required for module/lesson scope" }, { status: 400 });
  }

  // Resolve the affected video IDs based on scope.
  let videoIds: string[] = [];
  if (scope === "course") {
    const { data } = await sb.from("videos").select("id").eq("course_id", courseId);
    videoIds = (data ?? []).map((v) => v.id);
  } else if (scope === "module") {
    const { data: lessons } = await sb.from("lessons").select("id").eq("course_id", courseId).eq("module_id", targetId!);
    const lessonIds = (lessons ?? []).map((l) => l.id);
    if (lessonIds.length) {
      const { data } = await sb.from("videos").select("id").eq("course_id", courseId).in("lesson_id", lessonIds);
      videoIds = (data ?? []).map((v) => v.id);
    }
  } else {
    const { data } = await sb.from("videos").select("id").eq("course_id", courseId).eq("lesson_id", targetId!);
    videoIds = (data ?? []).map((v) => v.id);
  }

  if (videoIds.length === 0) return NextResponse.json({ ok: true, affected: 0 });

  const reason = `${scope} outcomes changed`;
  const stale_since = new Date().toISOString();

  // Try to update each table; tolerate missing columns (fresh DBs that
  // haven't applied the stale-flag migration yet still respond gracefully).
  const updates = [
    sb.from("content_briefs").update({ stale_since, stale_reason: reason }).in("video_id", videoIds),
    sb.from("ppt_slides").update({ stale_since, stale_reason: reason }).in("video_id", videoIds),
    sb.from("content_items").update({ stale_since, stale_reason: reason }).in("video_id", videoIds),
  ];
  await Promise.allSettled(updates);

  return NextResponse.json({ ok: true, scope, targetId: targetId ?? null, affected: videoIds.length });
}
