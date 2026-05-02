// src/app/api/export/scorm/route.ts
//
// GET /api/export/scorm?courseId=...
//
// Streams a SCORM 1.2 conformant .zip. Aggregates lessons, transcripts,
// readings (from content_items where type='reading'), and quizzes (from
// the new assessments + questions tables) into a self-contained package
// importable by Canvas / Blackboard / Moodle / Cornerstone / etc.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { buildScormZip, CourseForExport, LessonForExport } from "@/lib/exporters/scorm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId)
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  const supabase = await getServerSupabase();

  // Ownership check: collapse "not found" and "not yours" into 404 to avoid
  // leaking which course IDs exist in other orgs.
  const { data: ownerRow } = await supabase
    .from("courses")
    .select("org_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!ownerRow || ownerRow.org_id !== auth.orgId)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // 1. Course + org
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, title, description, org_id, orgs!inner(name)")
    .eq("id", courseId)
    .single();
  if (cErr || !course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // 2. Lessons + module title
  const { data: lessons, error: lErr } = await supabase
    .from("lessons")
    .select("id, title, description, order, module_id, modules!inner(title, order)")
    .eq("course_id", courseId)
    .order("order", { ascending: true });
  if (lErr)
    return NextResponse.json({ error: lErr.message }, { status: 500 });

  // 3. Bulk-fetch attached objects for all lessons
  const lessonIds = (lessons || []).map((l) => l.id);
  const [{ data: videos }, { data: transcripts }, { data: readings }, { data: assessments }] =
    await Promise.all([
      supabase.from("videos").select("lesson_id, video_url:recording_url").in("lesson_id", lessonIds),
      supabase.from("transcripts").select("lesson_id, text_content").in("lesson_id", lessonIds),
      supabase
        .from("content_items")
        .select("lesson_id, title, content")
        .eq("type", "reading")
        .in("lesson_id", lessonIds),
      supabase
        .from("assessments")
        .select("id, lesson_id, title, passing_score, kind")
        .in("lesson_id", lessonIds)
        .in("kind", ["practice_quiz", "graded_quiz"]),
    ]);

  // Questions per assessment
  const assessmentIds = (assessments || []).map((a) => a.id);
  const { data: questions } = await supabase
    .from("questions")
    .select("id, assessment_id, prompt, options, correct_answers, order")
    .in("assessment_id", assessmentIds)
    .order("order", { ascending: true });

  // Index by lesson
  const byLesson = <T extends { lesson_id: string }>(rows: T[] | null | undefined) => {
    const map: Record<string, T[]> = {};
    (rows || []).forEach((r) => {
      (map[r.lesson_id] = map[r.lesson_id] || []).push(r);
    });
    return map;
  };
  const videosByLesson = byLesson(videos as { lesson_id: string; video_url?: string }[]);
  const transcriptsByLesson = byLesson(transcripts as { lesson_id: string; text_content?: string }[]);
  const readingsByLesson = byLesson(readings as { lesson_id: string; title: string; content: unknown }[]);
  const assessmentsByLesson = byLesson(
    assessments as { id: string; lesson_id: string; title: string; passing_score: number; kind: string }[]
  );

  const questionsByAssessment: Record<string, typeof questions> = {};
  (questions || []).forEach((q) => {
    (questionsByAssessment[q.assessment_id] = questionsByAssessment[q.assessment_id] || []).push(q);
  });

  // Shape into the exporter's expected payload
  const lessonsForExport: LessonForExport[] = (lessons || []).map((l) => {
    const lessonAssessments = assessmentsByLesson[l.id] || [];
    return {
      id: l.id,
      title: l.title,
      description: l.description,
      order: l.order,
      module_title:
        (l as { modules?: { title?: string } }).modules?.title || "Module",
      video_url: videosByLesson[l.id]?.[0]?.video_url ?? null,
      transcript_text: transcriptsByLesson[l.id]?.[0]?.text_content ?? null,
      readings: (readingsByLesson[l.id] || []).map((r) => ({
        title: r.title,
        content_md: typeof r.content === "string" ? r.content : JSON.stringify(r.content),
      })),
      quizzes: lessonAssessments.map((a) => ({
        title: a.title,
        passing_score: a.passing_score ?? 70,
        questions: (questionsByAssessment[a.id] || []).map((q) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const correct = Array.isArray(q.correct_answers)
            ? (q.correct_answers as string[])
            : [];
          return {
            id: q.id,
            prompt: q.prompt,
            options: opts.map((o: { id: string; text: string } | string, i: number) =>
              typeof o === "string"
                ? { id: `opt-${i}`, text: o }
                : { id: o.id ?? `opt-${i}`, text: o.text }
            ),
            correct_option_ids: correct,
          };
        }),
      })),
    };
  });

  const courseForExport: CourseForExport = {
    id: course.id,
    title: course.title,
    description: course.description,
    org_name: (course as { orgs?: { name?: string } }).orgs?.name ?? null,
    lessons: lessonsForExport,
  };

  const buf = await buildScormZip(courseForExport);
  const filename = `${slug(course.title)}-scorm12.zip`;
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const body = new Blob([ab], { type: "application/zip" });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
