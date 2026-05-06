// Server-side computation of per-stage status (done/in_progress/todo).
// Used by the StageNav stepper to show real course progress at a glance.

import type { SupabaseClient } from "@supabase/supabase-js";

export type StageSlug =
  | "profile" | "toc" | "briefs" | "ppts"
  | "recording" | "transcript" | "content" | "review";

export type StageStatus = "done" | "active" | "in_progress" | "todo";

export async function loadStageStatus(
  sb: SupabaseClient,
  courseId: string,
): Promise<Partial<Record<StageSlug, StageStatus>>> {
  // Single batched read of just the counts/booleans we need.
  const [
    { data: course },
    { count: moduleCount },
    { count: lessonCount },
    { count: videoCount },
    { count: briefDraft },
    { count: briefApproved },
    { count: slideRows },
    { count: recordings },
    { count: transcripts },
    { count: contentItems },
    { count: contentApproved },
  ] = await Promise.all([
    sb.from("courses").select("profile, toc_locked, status").eq("id", courseId).maybeSingle(),
    sb.from("modules").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("videos").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("content_briefs").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("status", "draft"),
    sb.from("content_briefs").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("status", "approved"),
    sb.from("ppt_slides").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("recordings").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("transcripts").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("content_items").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    sb.from("content_items").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("status", "approved"),
  ]);

  const profile = (course?.profile ?? {}) as Record<string, unknown>;
  const profileFilled =
    Boolean(profile?.audience) ||
    Boolean(profile?.outcomes) ||
    Object.keys(profile).length >= 3;

  const tocLocked = Boolean(course?.toc_locked);
  const tocStarted = (moduleCount ?? 0) > 0;

  const totalVideos = videoCount ?? 0;
  const totalBriefs = (briefDraft ?? 0) + (briefApproved ?? 0);
  const totalSlides = slideRows ?? 0;
  const totalRec = recordings ?? 0;
  const totalTr = transcripts ?? 0;
  const totalContent = contentItems ?? 0;
  const totalContentApproved = contentApproved ?? 0;

  const ratio = (n: number, d: number) => (d > 0 ? n / d : 0);

  const status: Partial<Record<StageSlug, StageStatus>> = {
    profile: profileFilled ? "done" : "in_progress",
    toc: tocLocked ? "done" : tocStarted ? "in_progress" : "todo",
    briefs:
      totalBriefs === 0
        ? "todo"
        : (briefApproved ?? 0) >= totalVideos && totalVideos > 0
          ? "done"
          : "in_progress",
    ppts:
      totalSlides === 0 ? "todo" :
      ratio(totalSlides, totalVideos * 8) >= 1 ? "done" :
      "in_progress",
    recording:
      totalRec === 0 ? "todo" :
      totalRec >= totalVideos && totalVideos > 0 ? "done" : "in_progress",
    transcript:
      totalTr === 0 ? "todo" :
      totalTr >= totalVideos && totalVideos > 0 ? "done" : "in_progress",
    content:
      totalContent === 0 ? "todo" :
      totalContentApproved >= totalContent && totalContent > 0 ? "done" : "in_progress",
    review: course?.status === "published" ? "done" : "todo",
  };

  void lessonCount; // tracked for future use
  return status;
}
