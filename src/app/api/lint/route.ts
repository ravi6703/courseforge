// src/app/api/lint/[courseId]/route.ts
//
// GET /api/lint?courseId=...
// Returns a LintReport for the course. Used by the Course Health panel and the
// Final Review tab to produce the "ready to publish" verdict.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { lintCourse } from "@/lib/lint/pedagogy";
import type { Course, Module } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId)
    return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [{ data: course }, { data: modules }, { data: lessons }, { data: videos }, { data: assessments }, { data: questions }] =
    await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).single(),
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

  if (!course)
    return NextResponse.json({ error: "course not found" }, { status: 404 });

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
    course: course as Course,
    modules: stitchedModules,
    assessments: assessments || [],
    questions: questions || [],
  });

  return NextResponse.json(report);
}
