import { getServerSupabase } from "@/lib/supabase/server";
import { ContentView, ContentVideoRow } from "./ContentView";

export default async function ContentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // Fetch course with full hierarchy: modules → lessons → videos
  const { data: course } = await supabase
    .from("courses")
    .select(
      `
      id, title,
      modules(
        id, title, order,
        lessons(
          id, title, order,
          videos(
            id, title, duration_minutes, order,
            content_items(
              id, kind, status, payload, generated_at, approved_at,
              generation_error
            )
          )
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!course || !course.modules) {
    return (
      <div className="rounded-lg border border-dashed border-bi-navy-300 p-10 text-center text-sm text-bi-navy-500">
        Course not found.
      </div>
    );
  }

  // Build rows array: video level with nested content items
  const rows: ContentVideoRow[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons || []) {
      for (const video of lesson.videos || []) {
        rows.push({
          videoId: video.id,
          videoTitle: video.title,
          lessonTitle: lesson.title,
          moduleTitle: mod.title,
          contentItems: (video.content_items || []) as Array<{
            id: string;
            kind: string;
            status: string;
            payload: Record<string, unknown>;
            generated_at: string | null;
            approved_at: string | null;
            generation_error: string | null;
          }>,
        });
      }
    }
  }

  // KPI stats
  const allItems = rows.flatMap((r) => r.contentItems);
  const videosWithContent = rows.filter((r) => r.contentItems.length > 0).length;
  const approvedCount = allItems.filter((i) => i.status === "approved").length;
  const totalCount = allItems.length;

  return (
    <ContentView
      courseId={id}
      rows={rows}
      kpis={{
        videosWithContent,
        approvedCount,
        totalCount,
      }}
    />
  );
}
