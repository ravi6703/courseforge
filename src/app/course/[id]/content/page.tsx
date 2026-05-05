// Content tab — overview grid (videos × artifact kinds).
//
// Round A.4: split into three pages so each surface has one job:
//   /content                        — this overview
//   /content/[videoId]              — per-video workspace (all kinds)
//   /content/[videoId]/[kind]       — focused full-page editor

import { getServerSupabase } from "@/lib/supabase/server";
import { ContentOverview } from "./ContentOverview";

export default async function ContentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

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
            id, title, order,
            content_items(id, kind, status, stale_since)
          )
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!course || !course.modules) {
    return (
      <div className="rounded-lg border border-dashed border-bi-navy-200 p-10 text-center text-sm text-bi-navy-500">
        Course not found.
      </div>
    );
  }

  // Flatten to overview rows.
  const rows: Array<{
    videoId: string; videoTitle: string;
    lessonTitle: string; moduleTitle: string; moduleOrder: number;
    contentItems: Array<{ id: string; kind: string; status: string }>;
  }> = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons || []) {
      for (const video of lesson.videos || []) {
        rows.push({
          videoId: video.id,
          videoTitle: video.title,
          lessonTitle: lesson.title,
          moduleTitle: mod.title,
          moduleOrder: mod.order ?? 0,
          contentItems: (video.content_items || []) as Array<{ id: string; kind: string; status: string; stale_since?: string | null }>,
        });
      }
    }
  }

  return <ContentOverview courseId={id} rows={rows} />;
}
