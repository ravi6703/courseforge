// src/app/api/export/coursera/route.ts — Coursera import-pack download.

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireUser } from "@/lib/supabase/server";
import { buildCourseraPack, CourseraCourse, CourseraModule, CourseraLesson, CourseraVideo } from "@/lib/exporters/coursera";
import type { SlideJSON } from "@/lib/exporters/pptx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId)
    return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const supabase = getServiceSupabase();

  // Ownership check: collapse "not found" and "not yours" into 404 to avoid
  // leaking which course IDs exist in other orgs.
  const { data: ownerRow } = await supabase
    .from("courses")
    .select("org_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!ownerRow || ownerRow.org_id !== auth.orgId)
    return NextResponse.json({ error: "course not found" }, { status: 404 });

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, domain, orgs!inner(name, brand_kit)")
    .eq("id", courseId)
    .single();
  if (!course)
    return NextResponse.json({ error: "course not found" }, { status: 404 });

  const [
    { data: modules },
    { data: lessons },
    { data: videos },
    { data: slides },
    { data: transcripts },
    { data: readings },
    { data: assessments },
    { data: questions },
  ] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, description, duration_hours, order")
      .eq("course_id", courseId)
      .order("order", { ascending: true }),
    supabase
      .from("lessons")
      .select("id, module_id, title, description, order")
      .eq("course_id", courseId)
      .order("order", { ascending: true }),
    supabase
      .from("videos")
      .select("id, lesson_id, title, duration_minutes, order")
      .eq("course_id", courseId)
      .order("order", { ascending: true }),
    supabase
      .from("ppt_slides")
      .select("video_id, slide_number, title, content, speaker_notes, layout_type")
      .eq("course_id", courseId)
      .order("slide_number", { ascending: true }),
    supabase
      .from("transcripts")
      .select("video_id, segments")
      .eq("course_id", courseId),
    supabase
      .from("content_items")
      .select("lesson_id, title, content")
      .eq("course_id", courseId)
      .eq("type", "reading"),
    supabase
      .from("assessments")
      .select("id, lesson_id, title, passing_score, kind")
      .eq("course_id", courseId)
      .in("kind", ["practice_quiz", "graded_quiz"]),
    supabase
      .from("questions")
      .select("assessment_id, prompt, options, correct_answers, explanation, order")
      .eq("course_id", courseId)
      .order("order", { ascending: true }),
  ]);

  const slidesByVideo: Record<string, SlideJSON[]> = {};
  (slides || []).forEach((s) =>
    (slidesByVideo[s.video_id] = slidesByVideo[s.video_id] || []).push(s as unknown as SlideJSON)
  );

  const segmentsByVideo: Record<string, Array<{ start: number; end: number; text: string }>> = {};
  (transcripts || []).forEach((t) => {
    segmentsByVideo[t.video_id] = (t.segments as Array<{ start: number; end: number; text: string }>) || [];
  });

  const videosByLesson: Record<string, CourseraVideo[]> = {};
  (videos || []).forEach((v) => {
    (videosByLesson[v.lesson_id] = videosByLesson[v.lesson_id] || []).push({
      id: v.id,
      title: v.title,
      duration_minutes: v.duration_minutes ?? 0,
      order: v.order,
      slides: slidesByVideo[v.id] || [],
      transcript_segments: segmentsByVideo[v.id] || [],
    });
  });

  const readingsByLesson: Record<string, Array<{ title: string; content_md: string }>> = {};
  (readings || []).forEach((r) => {
    (readingsByLesson[r.lesson_id] = readingsByLesson[r.lesson_id] || []).push({
      title: r.title,
      content_md: typeof r.content === "string" ? r.content : JSON.stringify(r.content),
    });
  });

  const questionsByAssessment: Record<string, typeof questions> = {};
  (questions || []).forEach((q) => {
    (questionsByAssessment[q.assessment_id] = questionsByAssessment[q.assessment_id] || []).push(q);
  });

  const quizzesByLesson: Record<string, CourseraLesson["quizzes"]> = {};
  (assessments || []).forEach((a) => {
    const qs = questionsByAssessment[a.id] || [];
    (quizzesByLesson[a.lesson_id] = quizzesByLesson[a.lesson_id] || []).push({
      title: a.title,
      passing_score: a.passing_score ?? 70,
      questions: qs.map((q) => {
        const opts = (q.options as Array<{ id: string; text: string } | string>) || [];
        const optTexts = opts.map((o) => (typeof o === "string" ? o : o.text));
        const correct = (q.correct_answers as string[])?.[0];
        const correctIdx = opts.findIndex((o) =>
          typeof o === "string" ? o === correct : o.id === correct
        );
        return {
          prompt: q.prompt,
          options: optTexts,
          correct_index: Math.max(0, correctIdx),
          explanation: q.explanation || "",
        };
      }),
    });
  });

  const lessonsByModule: Record<string, CourseraLesson[]> = {};
  (lessons || []).forEach((l) =>
    (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] || []).push({
      id: l.id,
      title: l.title,
      description: l.description,
      order: l.order,
      videos: videosByLesson[l.id] || [],
      readings: readingsByLesson[l.id] || [],
      quizzes: quizzesByLesson[l.id] || [],
    })
  );

  const courseraCourse: CourseraCourse = {
    id: course.id,
    title: course.title,
    description: course.description,
    domain: course.domain,
    org_name: (course as { orgs?: { name?: string } }).orgs?.name ?? null,
    brand_color_hex:
      (course as { orgs?: { brand_kit?: { primary_hex?: string } } }).orgs?.brand_kit?.primary_hex ?? null,
    modules: (modules || []).map(
      (m): CourseraModule => ({
        id: m.id,
        title: m.title,
        description: m.description,
        duration_hours: m.duration_hours,
        order: m.order,
        lessons: lessonsByModule[m.id] || [],
      })
    ),
  };

  const buf = await buildCourseraPack(courseraCourse);
  const filename = `${courseId.slice(0, 8)}-coursera-pack.zip`;
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
