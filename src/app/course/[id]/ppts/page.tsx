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

  const [{ data: videos }, { data: slides }, { data: uploads }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, lesson_id, status, order, lessons!inner(id, title, modules!inner(title, order))")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("ppt_slides").select("id, video_id, status").eq("course_id", id),
    supabase.from("ppt_uploads").select("id, video_id, original_filename, slide_count, status").eq("course_id", id),
  ]);

  const slideCountByVideo: Record<string, { total: number; approved: number }> = {};
  (slides || []).forEach((s) => {
    const r = (slideCountByVideo[s.video_id] = slideCountByVideo[s.video_id] || { total: 0, approved: 0 });
    r.total++;
    if (s.status === "approved" || s.status === "finalized") r.approved++;
  });
  const uploadByVideo: Record<string, { filename: string; status: string }> = {};
  (uploads || []).forEach((u) => (uploadByVideo[u.video_id] = { filename: u.original_filename, status: u.status }));

  const rows: TrackerRow[] = (videos || []).map((v) => {
    const lesson = (v as { lessons?: { id?: string; title?: string; modules?: { title?: string } } }).lessons;
    return {
      videoId: v.id,
      videoTitle: v.title,
      lessonId: lesson?.id ?? "",
      lessonTitle: lesson?.title ?? "—",
      moduleTitle: lesson?.modules?.title ?? "—",
      videoStatus: v.status as string,
      slidesTotal: slideCountByVideo[v.id]?.total ?? 0,
      slidesApproved: slideCountByVideo[v.id]?.approved ?? 0,
      upload: uploadByVideo[v.id] ?? null,
    };
  });

  return <PptTrackerClient courseId={id} initialRows={rows} />;
}
