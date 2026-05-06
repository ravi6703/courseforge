// src/app/course/[id]/ppts/page.tsx
//
// Presentations tab. Server component fetches videos + slides + uploads,
// hands off to a client subcomponent that owns the Generate buttons and
// the export downloads.

import { getServerSupabase } from "@/lib/supabase/server";
import { PptTrackerClient, TrackerRow } from "./PptTrackerClient";

export default async function PresentationsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: videos }, { data: slides }, { data: uploads }, { data: briefs }, { data: course }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, lesson_id, status, order, lessons!inner(id, title, modules!inner(id, title, order))")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("ppt_slides").select("id, video_id, status").eq("course_id", id),
    supabase.from("ppt_uploads").select("id, video_id, original_filename, slide_count, status").eq("course_id", id),
    supabase.from("content_briefs").select("video_id, status").eq("course_id", id),
    supabase.from("courses").select("ppt_settings").eq("id", id).maybeSingle(),
  ]);

  // Phase 1 — only videos with an approved brief get a PPT slot
  const approvedVideoIds = new Set(
    (briefs || []).filter((b) => b.status === "approved").map((b) => b.video_id)
  );
  const totalVideos = (videos || []).length;
  const waitingOnApproval = totalVideos - approvedVideoIds.size;
  const filteredVideos = (videos || []).filter((v) => approvedVideoIds.has(v.id));

  const slideCountByVideo: Record<string, { total: number; approved: number }> = {};
  (slides || []).forEach((s) => {
    const r = (slideCountByVideo[s.video_id] = slideCountByVideo[s.video_id] || { total: 0, approved: 0 });
    r.total++;
    if (s.status === "approved" || s.status === "finalized") r.approved++;
  });
  const uploadByVideo: Record<string, { filename: string; status: string }> = {};
  (uploads || []).forEach((u) => (uploadByVideo[u.video_id] = { filename: u.original_filename, status: u.status }));

  const rows: TrackerRow[] = filteredVideos.map((v) => {
    const lesson = (v as { lessons?: { id?: string; title?: string; modules?: { id?: string; title?: string } } }).lessons;
    return {
      videoId: v.id,
      videoTitle: v.title,
      lessonId: lesson?.id ?? "",
      lessonTitle: lesson?.title ?? "—",
      moduleTitle: lesson?.modules?.title ?? "—",
      moduleId: lesson?.modules?.id,
      videoStatus: v.status as string,
      slidesTotal: slideCountByVideo[v.id]?.total ?? 0,
      slidesApproved: slideCountByVideo[v.id]?.approved ?? 0,
      upload: uploadByVideo[v.id] ?? null,
    };
  });

  const pptSettings = (course as { ppt_settings?: Record<string, unknown> } | null)?.ppt_settings ?? null;

  return (
    <PptTrackerClient
      courseId={id}
      courseHref={`/course/${id}`}
      initialRows={rows}
      waitingOnApproval={waitingOnApproval}
      totalVideos={totalVideos}
      pptSettings={pptSettings as unknown as import("./DeckSettings").PptSettings | null}
    />
  );
}
