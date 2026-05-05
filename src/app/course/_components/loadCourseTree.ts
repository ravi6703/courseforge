// Server-side data loader for the CourseTree sidebar.
// Pulls course → modules → lessons → videos → content_items in one
// nested select; computes per-video artifact status and aggregate
// progress + health score.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseTreeData } from "./CourseTree";

export async function loadCourseTreeData(sb: SupabaseClient, courseId: string): Promise<CourseTreeData | null> {
  const { data: course } = await sb
    .from("courses")
    .select(`
      id, title,
      modules (
        id, title, order,
        lessons (
          id, title, order,
          videos (
            id, title, duration_minutes, order, status,
            content_items ( kind, status )
          )
        )
      )
    `)
    .eq("id", courseId)
    .maybeSingle();

  if (!course) return null;

  // Sort by `order` then map; Supabase doesn't guarantee nested order
  // even with the order() hint when nested-selecting through arrays.
  const modules = (course.modules ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((m) => ({
    id: m.id,
    title: m.title,
    lessons: (m.lessons ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((l) => ({
      id: l.id,
      title: l.title,
      videos: (l.videos ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((v) => ({
        id: v.id,
        title: v.title,
        duration_minutes: v.duration_minutes ?? null,
        status: v.status ?? null,
        artifacts: ((v.content_items as Array<{ kind: string; status: string }> | null) ?? []).reduce(
          (acc, ci) => {
            acc[ci.kind] = ci.status === "approved" ? "approved" : "draft";
            return acc;
          },
          {} as Record<string, "approved" | "draft" | "missing">
        ),
      })),
    })),
  }));

  // Aggregate progress: how many of the 5 artifacts are approved per video.
  const allVideos = modules.flatMap((m) => m.lessons.flatMap((l) => l.videos));
  const totalArtifacts = allVideos.length * 5;
  const approved = allVideos.reduce(
    (sum, v) => sum + Object.values(v.artifacts ?? {}).filter((s) => s === "approved").length,
    0
  );
  const progressPct = totalArtifacts > 0 ? Math.round((approved / totalArtifacts) * 100) : 0;

  return {
    courseId: course.id,
    courseTitle: course.title,
    modules,
    progressPct,
    healthScore: null, // wired in PATCH 9 when the lint pass becomes a server fetch
  };
}
