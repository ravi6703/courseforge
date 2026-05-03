// Public, SSR-rendered Course Health Score page.
//
//   /health-score/<course_id>
//
// Anonymous, indexable, shareable. The course owner toggles
// public_health_score in course settings; until then this page returns
// notFound() so existence isn't leaked. Renders the score, the per-rule
// breakdown, the badge embed snippet, and a link to /learning-science
// for the methodology.

import { notFound } from "next/navigation";
import Link from "next/link";
// eslint-disable-next-line no-restricted-syntax -- legit: anonymous public page, gated by public_health_score flag
import { getServiceSupabase } from "@/lib/supabase/server";
import { lintCourse, type LintReport } from "@/lib/lint/pedagogy";
import { gradeForScore, RULE_LABELS } from "@/lib/health-score/grade";
import type { Course, Module } from "@/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 minutes — same as the API

interface PageProps { params: { courseId: string } }

interface PublicData {
  course: { id: string; title: string; audience_level: string | null; duration_weeks: number | null };
  report: LintReport;
}

async function load(courseId: string): Promise<PublicData | null> {
  const sb = getServiceSupabase();
  const { data: course } = await sb
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || !course.public_health_score) return null;

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

  return {
    course: {
      id: course.id,
      title: course.title,
      audience_level: course.audience_level ?? null,
      duration_weeks: course.duration_weeks ?? null,
    },
    report,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await load(params.courseId);
  if (!data) return { title: "Course Health Score · CourseForge" };
  const style = gradeForScore(data.report.score);
  return {
    title: `${data.course.title} — Pedagogy Score ${data.report.score} (${style.grade}) · CourseForge`,
    description: `Independent pedagogy assessment of "${data.course.title}". Verified by CourseForge across 7 learning-science dimensions.`,
    openGraph: {
      title: `${data.course.title} — Pedagogy ${data.report.score} (${style.grade})`,
      description: `Verified by CourseForge across 7 learning-science dimensions: ${style.label}.`,
      images: [`/api/health-score/${data.course.id}/badge.svg`],
      type: "website",
    },
  };
}

export default async function PublicHealthScorePage({ params }: PageProps) {
  const data = await load(params.courseId);
  if (!data) return notFound();

  const { course, report } = data;
  const style = gradeForScore(report.score);

  // Group findings by rule so coaches can see the dimensions that pulled them down.
  const byRule: Record<string, { critical: number; warning: number; info: number }> = {};
  Object.keys(RULE_LABELS).forEach((r) => (byRule[r] = { critical: 0, warning: 0, info: 0 }));
  report.findings.forEach((f) => {
    if (!byRule[f.rule]) byRule[f.rule] = { critical: 0, warning: 0, info: 0 };
    byRule[f.rule][f.severity] += 1;
  });

  const badgeUrl = `/api/health-score/${course.id}/badge.svg`;
  const embedHtml = `<a href="https://courseforge-rust.vercel.app/health-score/${course.id}"><img src="https://courseforge-rust.vercel.app/api/health-score/${course.id}/badge.svg" alt="CourseForge Pedagogy Score" /></a>`;

  return (
    <main className="min-h-screen bg-bi-navy-50">
      {/* Header */}
      <header className="bg-bi-navy-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">CourseForge</Link>
          <div className="text-xs text-white/70">Verified Pedagogy Score</div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="text-xs uppercase tracking-wider text-bi-navy-600 mb-2">Course pedagogy assessment</div>
        <h1 className="text-3xl md:text-4xl font-bold text-bi-navy-700 leading-tight">{course.title}</h1>
        <div className="text-sm text-bi-navy-600 mt-2">
          {course.audience_level ? `${course.audience_level} · ` : ""}
          {course.duration_weeks ? `${course.duration_weeks} weeks` : "duration unset"}
        </div>

        <div className="mt-8 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex items-center gap-5">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: style.bg }}
              aria-label={`Score ${report.score} out of 100, grade ${style.grade}`}
            >
              <div className="text-center leading-none">
                <div className="text-4xl font-bold">{report.score}</div>
                <div className="text-xs opacity-80 mt-1">/ 100</div>
              </div>
            </div>
            <div>
              <div className="text-5xl font-bold text-bi-navy-700">{style.grade}</div>
              <div className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded ${style.pill}`}>{style.label}</div>
            </div>
          </div>

          <div className="md:ml-auto grid grid-cols-3 gap-3 text-center min-w-[260px]">
            <div className="rounded-lg bg-white border border-bi-navy-100 px-3 py-3">
              <div className="text-2xl font-bold text-red-700">{report.by_severity.critical}</div>
              <div className="text-xs text-bi-navy-600 mt-1">Critical</div>
            </div>
            <div className="rounded-lg bg-white border border-bi-navy-100 px-3 py-3">
              <div className="text-2xl font-bold text-amber-700">{report.by_severity.warning}</div>
              <div className="text-xs text-bi-navy-600 mt-1">Warnings</div>
            </div>
            <div className="rounded-lg bg-white border border-bi-navy-100 px-3 py-3">
              <div className="text-2xl font-bold text-bi-navy-700">{report.by_severity.info}</div>
              <div className="text-xs text-bi-navy-600 mt-1">Info</div>
            </div>
          </div>
        </div>
      </section>

      {/* Per-rule breakdown */}
      <section className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-xl font-bold text-bi-navy-700 mb-3">How the score was built</h2>
        <p className="text-sm text-bi-navy-600 mb-5">
          Seven independent dimensions, weighted by severity. <Link href="/learning-science" className="underline text-bi-blue-600">Read the methodology</Link>.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(RULE_LABELS).map(([rule, meta]) => {
            const counts = byRule[rule] || { critical: 0, warning: 0, info: 0 };
            const issues = counts.critical + counts.warning + counts.info;
            return (
              <div key={rule} className="bg-white border border-bi-navy-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-bi-navy-700">{meta.title}</div>
                    <div className="text-sm text-bi-navy-600 mt-1">{meta.what}</div>
                  </div>
                  <div className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    issues === 0 ? "bg-emerald-100 text-emerald-700" :
                    counts.critical > 0 ? "bg-red-100 text-red-700" :
                    counts.warning > 0 ? "bg-amber-100 text-amber-700" :
                    "bg-bi-navy-100 text-bi-navy-700"
                  }`}>
                    {issues === 0 ? "Pass" : `${issues} issue${issues > 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Embed badge */}
      <section className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-xl font-bold text-bi-navy-700 mb-3">Embed this badge</h2>
        <div className="bg-white border border-bi-navy-100 rounded-lg p-5 flex flex-col md:flex-row md:items-center gap-5">
          <img src={badgeUrl} alt="CourseForge Pedagogy Score badge" className="h-10" />
          <pre className="flex-1 text-xs bg-bi-navy-900 text-white p-3 rounded overflow-auto">{embedHtml}</pre>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-10 text-sm text-bi-navy-600">
        Verified by{" "}
        <Link href="/" className="font-semibold text-bi-navy-700 underline">CourseForge</Link>{" "}
        — an AI course production platform with built-in pedagogy linting.
        Methodology: <Link href="/learning-science" className="text-bi-blue-600 underline">/learning-science</Link>.
      </footer>
    </main>
  );
}
