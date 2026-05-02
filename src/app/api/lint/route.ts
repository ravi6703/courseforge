// GET /api/lint?courseId=...
//
// Returns a LintReport for the course. Used by the Course Health panel and
// the Final Review tab to produce the "ready to publish" verdict.
//
// Requires an authenticated user. The course must belong to the user's org.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { lintCourse } from "@/lib/lint/pedagogy";
import type { Course, Module } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId)
    return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const supabase = await getServerSupabase();

  // Ownership check: the course must exist AND belong to the caller's org.
  // We collapse "not found" and "not yours" into a single 404 so the API
  // doesn't leak which course IDs exist in other orgs.
  const { data: courseRow } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const [{ data: modules }, { data: lessons }, { data: videos }, { data: assessments }, { data: questions }] =
    await Promise.all([
      supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order", { ascending: true }),
      supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order", { ascending: true }),
      supabase.from("videos").select("*").eq("course_id", courseId),
      supabase.from("assessments").select("*").eq("course_id", courseId),
      supabase.from("questions").select("*").eq("course_id", courseId),
    ]);

  // Stitch modules → lessons → videos
  const lessonsByModule: Record<string, unknown[]> = {};
  (lessons || []).forEach((l) => {
    (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] || []).push({
      ...l,
      videos: (videos || []).filter((v) => v.lesson_id === l.id),
    });
  });
  const stitchedModules = (modules || []).map((m) => ({
    ...m,
    lessons: lessonsByModule[m.id] || [],
  })) as unknown as Module[];

  const report = lintCourse({
    course: courseRow as Course,
    modules: stitchedModules,
    assessments: assessments || [],
    questions: questions || [],
  });

  return NextResponse.json(report);
}
