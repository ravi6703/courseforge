// Briefs tab — Phase 1 Unit Consistency: 1 brief per VIDEO.
// Lists every video in the course (grouped by module → lesson) and
// shows progress as approved-briefs/total-videos so the count matches
// the PPT Tracker downstream.

import { getServerSupabase } from "@/lib/supabase/server";
import { BriefCard } from "./BriefCard";

export default async function BriefsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: course }, { data: videos }, { data: briefs }] = await Promise.all([
    supabase.from("courses").select("title, audience_level, prerequisites").eq("id", id).single(),
    supabase
      .from("videos")
      .select("id, title, order, lesson_id, lessons!inner(id, title, order, modules!inner(id, title, order))")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("content_briefs").select("*").eq("course_id", id),
  ]);

  // Map briefs by video_id (Phase 1 — was lesson_id)
  const briefByVideo: Record<string, {
    id: string;
    talking_points: unknown;
    visual_cues: unknown;
    key_takeaways: unknown;
    script_outline: string;
    estimated_duration?: string;
    status: string;
  }> = {};
  (briefs || []).forEach((b) => { if (b.video_id) briefByVideo[b.video_id] = b; });

  const total = (videos || []).length;
  const generated = Object.keys(briefByVideo).length;
  const approved = Object.values(briefByVideo).filter((b) => b.status === "approved").length;
  const pct = total ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-6 items-center">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Briefs approved</div>
          <div className="text-2xl font-bold mt-1">
            {approved}<span className="text-sm font-normal text-slate-500"> / {total} videos</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{generated} drafted</div>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{pct}% approved · slides unlock once approved</div>
        </div>
      </div>

      <div className="space-y-2">
        {(videos || []).map((v) => {
          const lesson = (v as { lessons?: { title?: string; modules?: { title?: string } } }).lessons;
          return (
            <BriefCard
              key={v.id}
              videoId={v.id}
              videoTitle={v.title}
              lessonTitle={lesson?.title ?? ""}
              moduleTitle={lesson?.modules?.title ?? ""}
              courseId={id}
              courseTitle={course?.title ?? ""}
              audienceLevel={course?.audience_level ?? null}
              prerequisites={course?.prerequisites ?? null}
              existingBrief={briefByVideo[v.id] ?? null}
            />
          );
        })}

        {total === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No videos yet — generate a TOC first to populate briefs.
          </div>
        )}
      </div>
    </div>
  );
}
