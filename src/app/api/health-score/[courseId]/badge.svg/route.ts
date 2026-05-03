// GET /api/health-score/[courseId]/badge.svg
//
// Anonymous SVG badge for course owners to embed in marketing pages,
// LMS profiles, GitHub readmes. Same gating as the JSON endpoint: only
// renders the real score when course.public_health_score = true. For
// courses that haven't opted in or don't exist, returns a neutral
// placeholder badge (broken images are noisier than a placeholder).

import type { NextRequest } from "next/server";
// eslint-disable-next-line no-restricted-syntax -- legit: anonymous public endpoint, gated by flag
import { getServiceSupabase } from "@/lib/supabase/server";
import { lintCourse } from "@/lib/lint/pedagogy";
import { gradeForScore } from "@/lib/health-score/grade";
import type { Course, Module } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const svg = await renderBadge(params.courseId);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

async function renderBadge(courseId: string): Promise<string> {
  let scoreText = "—";
  let gradeText = "?";
  let bg = "#6b7280";
  let fg = "#FFFFFF";

  if (courseId) {
    const sb = getServiceSupabase();
    const { data: course } = await sb
      .from("courses").select("*").eq("id", courseId).maybeSingle();

    if (course?.public_health_score) {
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
          ...l, videos: (videos || []).filter((v) => v.lesson_id === l.id),
        });
      });
      const stitched = (modules || []).map((m) => ({
        ...m, lessons: lessonsByModule[m.id] || [],
      })) as unknown as Module[];

      const report = lintCourse({
        course: course as Course, modules: stitched,
        assessments: assessments || [], questions: questions || [],
      });
      const style = gradeForScore(report.score);
      scoreText = String(report.score);
      gradeText = style.grade;
      bg = style.bg;
      fg = style.fg;
    }
  }

  const rightLabel = `${scoreText} · ${gradeText}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="40" role="img" aria-label="CourseForge Pedagogy: ${scoreText} grade ${gradeText}">
  <linearGradient id="cf-bg-grad" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".15"/>
    <stop offset="1" stop-opacity=".15"/>
  </linearGradient>
  <clipPath id="cf-clip"><rect width="220" height="40" rx="6" fill="#fff"/></clipPath>
  <g clip-path="url(#cf-clip)">
    <rect width="150" height="40" fill="#0B1F4D"/>
    <rect x="150" width="70"  height="40" fill="${bg}"/>
    <rect width="220" height="40" fill="url(#cf-bg-grad)"/>
  </g>
  <g fill="#fff" font-family="-apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="13">
    <text x="12" y="17" font-weight="700">CourseForge</text>
    <text x="12" y="32" opacity=".85">Pedagogy</text>
    <text x="185" y="25" fill="${fg}" text-anchor="middle" font-weight="700" font-size="15">${escapeXml(rightLabel)}</text>
  </g>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === '"' ? "&quot;" : "&apos;"
  );
}
