// GET /api/health-score/[courseId]
//
// Public, anonymous endpoint. Returns a LintReport for the course IFF
// course.public_health_score = true. Used by the SSR /health-score page,
// the embeddable SVG badge, and any external integrators who want the
// JSON. Cached at the edge for 5 minutes — content rarely changes that
// fast and we don't want a viral badge to DoS the database.
//
// Auth model: this endpoint never reads cookies, never honours session.
// The opt-in flag on the course is the entire access control. We use the
// service-role client because RLS would otherwise block anonymous reads.

import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-syntax -- legit: anonymous public endpoint, gated by public_health_score flag
import { getServiceSupabase } from "@/lib/supabase/server";
import { lintCourse } from "@/lib/lint/pedagogy";
import type { Course, Module } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  const courseId = params.courseId;
  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const sb = getServiceSupabase();

  const { data: course } = await sb
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!course.public_health_score) {
    // Don't leak that the course exists. 404 is the same shape as the not-found response above.
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [{ data: modules }, { data: lessons }, { data: videos }, { data: assessments }, { data: questions }] =
    await Promise.all([
      sb.from("modules").select("*").eq("course_id", courseId).order("order", { ascending: true }),
      sb.from("lessons").select("*").eq("course_id", courseId).order("order", { ascending: true }),
      sb.from("videos").select("*").eq("course_id", courseId),
      sb.from("assessments").select("*").eq("course_id", courseId),
      sb.from("questions").select("*").eq("course_id", courseId),
    ]);

  const lessonsByModule: Record<string, unknown[]> = {};
  (lessons || []).forEach((l) => {
    (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] || []).push({
      ...l,
      videos: (videos || []).filter((v) => v.lesson_id === l.id),
    });
  });
  const stitched = (modules || []).map((m) => ({
    ...m,
    lessons: lessonsByModule[m.id] || [],
  })) as unknown as Module[];

  const report = lintCourse({
    course: course as Course,
    modules: stitched,
    assessments: assessments || [],
    questions: questions || [],
  });

  // Edge-cache for 5 min; stale-while-revalidate for an hour.
  const res = NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      audience_level: course.audience_level,
      duration_weeks: course.duration_weeks,
    },
    report,
    generated_at: new Date().toISOString(),
  });
  res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  return res;
}
