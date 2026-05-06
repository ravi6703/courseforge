// Content tab — v3 cockpit.
//
// Coach feedback: previous grid was "cluttered, needs product-level
// overhaul". Replaced with a 4-mode cockpit (Cockpit / By Lesson /
// By Artifact / Stale) plus a single-line health strip.
//
// Routes:
//   /content                                    — this cockpit
//   /content?view=lessons|artifacts|stale       — switches mode
//   /content/lesson/[lessonId]                  — per-lesson workspace
//   /content/lesson/[lessonId]/[kind]           — focused single-kind editor

import { getServerSupabase } from "@/lib/supabase/server";
import { CockpitShell } from "./cockpit/CockpitShell";
import type { OverviewRow } from "./cockpit/types";

export default async function ContentTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: course } = await supabase
    .from("courses")
    .select(`
      id, title, target_completion_date, target_days, created_at,
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

  const rows: OverviewRow[] = [];
  const sortedModules = (course.modules ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const mod of sortedModules) {
    const sortedLessons = (mod.lessons ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const lesson of sortedLessons) {
      rows.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
        moduleOrder: mod.order ?? 0,
        videoCount: (lesson.videos || []).length,
        contentItems: (lesson.content_items || []) as Array<{ id: string; kind: string; status: string; stale_since?: string | null }>,
      });
    }
  }

  // Days-to-deadline for the health strip
  let daysToDeadline: number | null = null;
  if (course.target_completion_date) {
    daysToDeadline = Math.round(
      (new Date(course.target_completion_date).getTime() - Date.now()) / 86_400_000,
    );
  }

  return <CockpitShell courseId={id} rows={rows} daysToDeadline={daysToDeadline} />;
}
