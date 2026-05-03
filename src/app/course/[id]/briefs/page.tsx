// Briefs tab — server component fetches data + hands off to client BriefsView
// for the grouped/filterable/bulk-actionable UX.

import { getServerSupabase } from "@/lib/supabase/server";
import { BriefsView, BriefRow } from "./BriefsView";

export default async function BriefsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: course }, { data: modules }, { data: lessons }, { data: videos }, { data: briefs }] = await Promise.all([
    supabase.from("courses").select("title, audience_level, prerequisites").eq("id", id).single(),
    supabase.from("modules").select("id, title, order").eq("course_id", id).order("order", { ascending: true }),
    supabase.from("lessons").select("id, title, order, module_id").eq("course_id", id).order("order", { ascending: true }),
    supabase.from("videos").select("id, title, order, lesson_id").eq("course_id", id).order("order", { ascending: true }),
    supabase.from("content_briefs").select("*").eq("course_id", id),
  ]);

  // Build the flat row list grouped by module
  const briefByVideo: Record<string, BriefRow["brief"]> = {};
  (briefs || []).forEach((b) => {
    if (b.video_id) briefByVideo[b.video_id] = {
      id: b.id,
      talking_points: b.talking_points,
      visual_cues: b.visual_cues,
      key_takeaways: b.key_takeaways,
      script_outline: b.script_outline,
      estimated_duration: b.estimated_duration,
      status: b.status,
    };
  });

  const lessonById: Record<string, { title: string; module_id: string }> = {};
  (lessons || []).forEach((l) => { lessonById[l.id] = { title: l.title, module_id: l.module_id }; });

  const moduleById: Record<string, { title: string; order: number }> = {};
  (modules || []).forEach((m) => { moduleById[m.id] = { title: m.title, order: m.order }; });

  const rows: BriefRow[] = (videos || []).map((v) => {
    const lesson = lessonById[v.lesson_id];
    const mod = lesson ? moduleById[lesson.module_id] : null;
    return {
      videoId: v.id,
      videoTitle: v.title,
      lessonId: v.lesson_id,
      lessonTitle: lesson?.title ?? "",
      moduleId: lesson?.module_id ?? "",
      moduleTitle: mod?.title ?? "",
      moduleOrder: mod?.order ?? 0,
      brief: briefByVideo[v.id] ?? null,
    };
  });

  return (
    <BriefsView
      courseId={id}
      courseTitle={course?.title ?? ""}
      audienceLevel={course?.audience_level ?? null}
      prerequisites={course?.prerequisites ?? null}
      rows={rows}
    />
  );
}
