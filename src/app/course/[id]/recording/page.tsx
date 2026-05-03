// Recording tab — server component fetches data + hands to client RecordingView
// for the upload + Zoom inbox interactions.

import { getServerSupabase } from "@/lib/supabase/server";
import { RecordingView, RecordingRow } from "./RecordingView";

export default async function RecordingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: videos }, { data: recordings }, { data: slides }, { data: zoomCreds }, { data: inbox }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, duration_minutes, lesson_id, lessons!inner(title)")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("recordings").select("*").eq("course_id", id),
    supabase.from("ppt_slides").select("video_id").eq("course_id", id),
    supabase.from("zoom_credentials").select("id").limit(1),
    supabase.from("recordings").select("id, audio_url, video_url, duration_seconds, recording_type, status, created_at").is("course_id", null).order("created_at", { ascending: false }),
  ]);

  const slideReadyVideoIds = new Set((slides || []).map((s) => s.video_id));
  const totalVideos = (videos || []).length;
  const filteredVideos = (videos || []).filter((v) => slideReadyVideoIds.has(v.id));
  const waitingOnSlides = totalVideos - filteredVideos.length;

  const recByVideo: Record<string, { id: string; type: string; status: string; duration_seconds?: number }> = {};
  (recordings || []).forEach((r) => (recByVideo[r.video_id] = {
    id: r.id, type: r.recording_type, status: r.status, duration_seconds: r.duration_seconds,
  }));

  const rows: RecordingRow[] = filteredVideos.map((v) => {
    const lesson = (v as { lessons?: { title?: string } }).lessons;
    const r = recByVideo[v.id];
    return {
      videoId: v.id,
      videoTitle: v.title,
      lessonTitle: lesson?.title ?? "",
      durationMinutesPlanned: v.duration_minutes ?? null,
      recording: r ? {
        id: r.id, type: r.type, status: r.status,
        durationSeconds: r.duration_seconds ?? null,
      } : null,
    };
  });

  return (
    <RecordingView
      courseId={id}
      courseHref={`/course/${id}`}
      rows={rows}
      waitingOnSlides={waitingOnSlides}
      totalVideos={totalVideos}
      zoomConnected={(zoomCreds ?? []).length > 0}
      inboxCount={(inbox ?? []).length}
      inbox={(inbox ?? []).map((r) => ({
        id: r.id,
        path: r.audio_url || r.video_url || "",
        type: r.recording_type,
        durationSeconds: r.duration_seconds ?? null,
        createdAt: r.created_at,
      }))}
    />
  );
}
