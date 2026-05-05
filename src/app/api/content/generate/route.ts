// /api/content/generate
//
// Generates a content artifact at LESSON scope (Reading / Practice quiz /
// Assessment / Worked example / Discussion / SCORM / AI Coach).
//
// The body now accepts:
//   { lesson_id, kind }                  ← preferred
//   { video_id, kind }                   ← legacy; we resolve lesson_id
//                                          and proceed lesson-scoped
//
// Why lesson-scoped: a lesson is a unit of learning; non-video artifacts
// belong to it (one Reading per lesson, one Practice quiz, etc).
// Per-video artifacts (briefs, slides) live elsewhere.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  buildPQPrompt, buildGQPrompt, buildReadingPrompt,
  buildAICoachPrompt, buildScormPrompt,
} from "@/lib/ai/prompts/content";
import { extractJson } from "@/lib/ai/extract/json";
import {
  PQPayloadSchema, GQPayloadSchema, ReadingPayloadSchema,
  AICoachPayloadSchema, ScormPayloadSchema,
} from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_KINDS = ["pq", "gq", "reading", "ai_coach", "scorm"] as const;
type Kind = typeof SUPPORTED_KINDS[number];

export async function POST(request: NextRequest) {
  const db = await getServerSupabase();
  const body = await request.json().catch(() => ({}));

  const kind = body.kind as Kind;
  if (!(SUPPORTED_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: `kind must be one of: ${SUPPORTED_KINDS.join(", ")}` }, { status: 400 });
  }

  // Resolve lesson_id. Accept either lesson_id directly, or video_id
  // (legacy) which we map to its lesson.
  let lessonId: string | undefined = body.lesson_id;
  if (!lessonId && body.video_id) {
    const { data: v } = await db.from("videos").select("lesson_id").eq("id", body.video_id).maybeSingle();
    lessonId = v?.lesson_id ?? undefined;
  }
  if (!lessonId) {
    return NextResponse.json({ error: "lesson_id (preferred) or video_id required" }, { status: 400 });
  }

  // Hydrate lesson + module + course + course_id for downstream prompt + RLS.
  const { data: lesson, error: lessonError } = await db
    .from("lessons")
    .select(`
      id, title, course_id,
      module:modules(id, title,
        course:courses(id, title)
      )
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const moduleObj = Array.isArray(lesson.module) ? lesson.module[0] : lesson.module;
  const courseObj = Array.isArray(moduleObj?.course) ? moduleObj.course[0] : moduleObj?.course;
  const lessonTitle = lesson.title || "Lesson";
  const moduleTitle = moduleObj?.title || "Module";
  const courseTitle = courseObj?.title || "Course";

  // Aggregate every video's transcript in this lesson — the lesson-level
  // artifact should cover the whole lesson, not a single video.
  const { data: transcripts } = await db
    .from("transcripts")
    .select("text_content, video_id, videos!inner(lesson_id, title, order)")
    .eq("videos.lesson_id", lessonId)
    .eq("status", "ready");

  const aggregateTranscript = (transcripts ?? [])
    .sort((a, b) => {
      const va = (a.videos as unknown as { order?: number } | null)?.order ?? 0;
      const vb = (b.videos as unknown as { order?: number } | null)?.order ?? 0;
      return va - vb;
    })
    .map((t) => {
      const v = t.videos as unknown as { title?: string } | null;
      return `## Video: ${v?.title ?? "Untitled"}\n\n${t.text_content}`;
    })
    .join("\n\n");

  if (!aggregateTranscript) {
    return NextResponse.json(
      { error: "No transcripts ready for this lesson's videos. Generate transcripts first on the Transcript tab." },
      { status: 400 },
    );
  }

  // Build the prompt. The lesson title acts as the "video title" stand-in
  // for the existing prompt builders — the underlying Claude prompts ask
  // for a single artifact covering the supplied content, which works
  // identically for a lesson aggregate.
  let prompt: { system: string; user: string };
  let schema;
  switch (kind) {
    case "pq":       prompt = buildPQPrompt(lessonTitle, aggregateTranscript, lessonTitle, moduleTitle, courseTitle); schema = PQPayloadSchema;       break;
    case "gq":       prompt = buildGQPrompt(lessonTitle, aggregateTranscript, lessonTitle, moduleTitle, courseTitle); schema = GQPayloadSchema;       break;
    case "reading":  prompt = buildReadingPrompt(lessonTitle, aggregateTranscript, lessonTitle, moduleTitle, courseTitle); schema = ReadingPayloadSchema; break;
    case "ai_coach": prompt = buildAICoachPrompt(lessonTitle, aggregateTranscript, lessonTitle, moduleTitle, courseTitle); schema = AICoachPayloadSchema; break;
    case "scorm":    prompt = buildScormPrompt(lessonTitle, aggregateTranscript, lessonTitle, moduleTitle, courseTitle); schema = ScormPayloadSchema;     break;
  }

  // Call Claude.
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: `network: ${(e as Error).message}` }, { status: 502 });
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return NextResponse.json({ error: `Claude ${resp.status}: ${t.slice(0, 200)}` }, { status: 502 });
  }

  const data = await resp.json();
  const responseText: string = data.content?.[0]?.text ?? "";
  const parsed = extractJson<Record<string, unknown>>(responseText, "object");
  if (!parsed.ok) {
    return NextResponse.json({ error: `Failed to parse Claude response: ${parsed.error}` }, { status: 502 });
  }

  const payloadValidation = schema.safeParse(parsed.value);
  if (!payloadValidation.success) {
    return NextResponse.json(
      { error: "Invalid generated content", issues: payloadValidation.error.issues },
      { status: 400 },
    );
  }

  // Upsert at lesson scope. The new partial unique index
  // content_items_lesson_kind_unique enforces one row per (lesson, kind).
  const { error: upsertError } = await db
    .from("content_items")
    .upsert(
      {
        course_id: lesson.course_id,
        lesson_id: lessonId,
        video_id: null,
        kind,
        payload: payloadValidation.data,
        status: "draft",
        generated_at: new Date().toISOString(),
      },
      { onConflict: "lesson_id,kind" },
    );

  if (upsertError) {
    return NextResponse.json(
      { error: `Failed to save: ${upsertError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, payload: payloadValidation.data, lesson_id: lessonId },
    { status: 201 },
  );
}
