import { getServerSupabase } from "@/lib/supabase/server";
import { BriefCard } from "./BriefCard";

export default async function BriefsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: course }, { data: lessons }, { data: briefs }] = await Promise.all([
    supabase.from("courses").select("title").eq("id", id).single(),
    supabase
      .from("lessons")
      .select("id, title, order, modules!inner(title, order)")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("content_briefs").select("*").eq("course_id", id),
  ]);

  const briefByLesson: Record<string, { talking_points: unknown; visual_cues: unknown; key_takeaways: unknown; script_outline: string; status: string }> = {};
  (briefs || []).forEach((b) => {
    if (b.lesson_id) briefByLesson[b.lesson_id] = b;
  });

  const total = (lessons || []).length;
  const generated = Object.keys(briefByLesson).length;
  const pct = total ? Math.round((generated / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-6 items-center">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Briefs generated</div>
          <div className="text-2xl font-bold mt-1">
            {generated}
            <span className="text-sm font-normal text-slate-500"> / {total}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{pct}% complete</div>
        </div>
      </div>

      <div className="space-y-2">
        {(lessons || []).map((lesson) => {
          const mod = (lesson as { modules?: { title?: string } }).modules;
          return (
            <BriefCard
              key={lesson.id}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              moduleTitle={mod?.title ?? ""}
              courseId={id}
              courseTitle={course?.title ?? ""}
              existingBrief={briefByLesson[lesson.id] ?? null}
            />
          );
        })}

        {total === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No lessons yet — generate a TOC first to populate briefs.
          </div>
        )}
      </div>
    </div>
  );
}
