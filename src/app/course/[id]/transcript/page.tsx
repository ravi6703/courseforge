// Transcript tab — shows all videos with per-row generate/regenerate transcript actions

import { getServerSupabase } from "@/lib/supabase/server";
import { TranscriptView, TranscriptVideoRow } from "./TranscriptView";

export default async function TranscriptTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // Fetch all videos with their lessons (modules)
  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, lesson_id, lessons!inner(id, title, module_id, modules!inner(id, title))")
    .eq("course_id", id)
    .order("order", { ascending: true });

  // Fetch all recordings for this course
  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, video_id, status")
    .eq("course_id", id);

  // Fetch all transcripts for this course
  const { data: transcripts } = await supabase
    .from("transcripts")
    .select("id, recording_id, video_id, status, word_count, text_content")
    .eq("course_id", id);

  // Index recordings and transcripts by video_id and recording_id
  const recordingByVideoId: Record<string, { id: string; status: string }> = {};
  (recordings || []).forEach((r) => {
    recordingByVideoId[r.video_id] = { id: r.id, status: r.status };
  });

  const transcriptByRecordingId: Record<
    string,
    { id: string; status: string; word_count: number; text_content: string }
  > = {};
  (transcripts || []).forEach((t) => {
    if (t.recording_id) {
      transcriptByRecordingId[t.recording_id] = {
        id: t.id,
        status: t.status,
        word_count: t.word_count || 0,
        text_content: t.text_content || "",
      };
    }
  });

  // Build rows for all videos
  const rows: TranscriptVideoRow[] = (videos || []).map((v) => {
    const lesson = (v as any).lessons?.[0];
    const mod = lesson?.modules?.[0];
    const recording = recordingByVideoId[v.id];
    const transcript = recording ? transcriptByRecordingId[recording.id] : null;

    return {
      videoId: v.id,
      videoTitle: v.title,
      lessonTitle: lesson?.title ?? "(untitled lesson)",
      moduleTitle: mod?.title ?? "(untitled module)",
      recording: recording
        ? {
            id: recording.id,
            status: recording.status,
          }
        : null,
      transcript: transcript || null,
    };
  });

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex gap-2">
        <button className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">
          Export as .pptx
        </button>
        <button className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">
          Export as SCORM 1.2
        </button>
        <button className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">
          Export for Coursera
        </button>
      </div>

      <TranscriptView courseId={id} rows={rows} />
    </div>
  );
}
