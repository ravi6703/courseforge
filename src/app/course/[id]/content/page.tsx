// Content tab — overview grid: lessons × artifact-kinds.
//
// As of the lesson-scope migration the 7 non-video artifacts (Reading,
// Practice quiz, Assessment, Worked example, Discussion, SCORM, AI
// Coach) belong to the lesson, not the video. Per-video Briefs and PPT
// slides remain on the Briefs / Slides tabs.
//
// Routes:
//   /content                                    — this overview
//   /content/lesson/[lessonId]                  — per-lesson workspace
//   /content/lesson/[lessonId]/[kind]           — focused single-kind editor

import { getServerSupabase } from "@/lib/supabase/server";
import { ContentOverview } from "./ContentOverview";

export default async function ContentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // Pull lessons (with module info), their videos for count, and the
  // lesson-scoped content items. video_id is now NULL for these rows;
  // we group by (lesson_id, kind).
  const { data: course } = await supabase
    .from("courses")
    .select(`
      id, title,
      modules(
        id, title, order,
        lessons(
          id, title, order,
          videos(id, title, order),
          content_items(id, kind, status, stale_since)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (!course || !course.modules) {
    return (
      <div className="rounded-lg border border-dashed border-bi-navy-200 p-10 text-center text-sm text-bi-navy-500">
        Course not found.
      </div>
    );
  }

  type OverviewRow = {
    lessonId: string;
    lessonTitle: string;
    moduleTitle: string;
    moduleOrder: number;
    videoCount: number;
    contentItems: Array<{ id: string; kind: string; status: string; stale_since?: string | null }>;
  };

  const rows: OverviewRow[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons || []) {
      rows.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleTitle: mod.title,
        moduleOrder: mod.order ?? 0,
        videoCount: (lesson.videos || []).length,
        contentItems: (lesson.content_items || []) as Array<{ id: string; kind: string; status: string; stale_since?: string | null }>,
      });
    }
  }

  return <ContentOverview courseId={id} rows={rows} />;
}
