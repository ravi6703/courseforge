// POST /api/ai/generate-slides
//
// Generate slides for a lesson (one video per lesson today). Persists into
// ppt_slides so the PPT tracker + exports immediately reflect the result.
//
// Request body: { lessonId: uuid, courseId: uuid }
// Response:     { success, slides_count, slides }

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { extractJson } from "@/lib/ai/extract/json";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SlideData {
  title: string;
  content: string[];
  speaker_notes: string;
  layout_type: "title" | "content" | "two_column" | "diagram" | "summary" | "code";
  order: number;
}

interface GenInput {
  lessonId: string;
  courseId: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "generate-slides");
  if (!__rl.ok) return rateLimitResponse(__rl);

  let body: GenInput;
  try { body = await req.json() as GenInput; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.lessonId || !body.courseId) {
    return NextResponse.json({ error: "lessonId and courseId required" }, { status: 400 });
  }

  const sb = await getServerSupabase();

  // Ownership + context fetch
  const { data: course } = await sb.from("courses").select("title, org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: lesson } = await sb
    .from("lessons")
    .select("id, title, modules!inner(title)")
    .eq("id", body.lessonId)
    .maybeSingle();
  if (!lesson) return NextResponse.json({ error: "lesson not found" }, { status: 404 });

  const { data: video } = await sb.from("videos").select("id, title").eq("lesson_id", body.lessonId).maybeSingle();
  if (!video) return NextResponse.json({ error: "no video for lesson" }, { status: 404 });

  const { data: brief } = await sb
    .from("content_briefs")
    .select("talking_points, visual_cues, key_takeaways, script_outline, coach_slide_count, coach_estimated_minutes")
    .eq("video_id", video.id)
    .maybeSingle();

  // Generate slides — Claude if key set, otherwise canned fallback
  let slides: SlideData[];
  let aiError: string | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    const result = await generateWithClaude({
      courseTitle: course.title,
      lessonTitle: lesson.title,
      moduleTitle: ((lesson as { modules?: { title?: string } }).modules?.title) ?? "",
      videoTitle: video.title,
      brief: brief ?? null,
      coachSlideCount: brief?.coach_slide_count ?? undefined,
      coachEstimatedMinutes: brief?.coach_estimated_minutes ?? undefined,
    });
    if (result.ok) slides = result.slides;
    else { aiError = result.error; slides = canned(video.title); }
  } else {
    slides = canned(video.title);
  }

  // Replace any existing slides for this video (regenerate is destructive on purpose)
  await sb.from("ppt_slides").delete().eq("video_id", video.id);

  const rows = slides.map((s) => ({
    org_id: auth.orgId,
    course_id: body.courseId,
    lesson_id: body.lessonId,
    video_id: video.id,
    slide_number: s.order,
    title: (s.title || "").slice(0, 200),
    content: s.content ?? [],
    speaker_notes: s.speaker_notes ?? "",
    layout_type: s.layout_type ?? "content",
    template_used: "ai-claude",
    status: "generated",
  }));
  if (rows.length) {
    const { error: insErr } = await sb.from("ppt_slides").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  await recordActivity(sb, {
    orgId: auth.orgId, userId: auth.profileId, userName: auth.email ?? undefined, userRole: auth.role,
    courseId: body.courseId,
    action: "slides.generated",
    targetType: "video",
    targetId: video.id,
    details: { slide_count: slides.length, lessonTitle: lesson.title },
  });

  const headers = aiHeaders(aiMode());
  if (aiError) headers["x-cf-ai-mode"] = "fallback-after-error";

  return NextResponse.json({ success: true, slides_count: slides.length, slides, ai_error: aiError ?? undefined }, { headers });
}

interface ClaudeIn {
  courseTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  videoTitle: string;
  brief: { talking_points?: unknown; visual_cues?: unknown; key_takeaways?: unknown; script_outline?: string } | null;
  coachSlideCount?: number;
  coachEstimatedMinutes?: number;
}

async function generateWithClaude(input: ClaudeIn): Promise<{ ok: true; slides: SlideData[] } | { ok: false; error: string }> {
  const prompt = `You are an expert instructional slide designer. Generate 6 slides for a single video lesson.

Course: ${input.courseTitle}
Module: ${input.moduleTitle}
Lesson: ${input.lessonTitle}
Video: ${input.videoTitle}

${input.brief ? `Content Brief (use as the source of truth for what to cover):
${JSON.stringify(input.brief, null, 2)}` : "(No brief available; generate from the lesson title alone.)"}

OUTPUT: a JSON array of exactly ${input.coachSlideCount ?? 6} slide objects${input.coachEstimatedMinutes ? ` for a ~${input.coachEstimatedMinutes}-minute video` : ""}. Each slide:
{
  "title": string (5-12 words, no terminal period),
  "content": string[] (2-5 bullet points, 5-15 words each),
  "speaker_notes": string (2-4 sentences a coach can read aloud verbatim),
  "layout_type": "title" | "content" | "two_column" | "diagram" | "summary" | "code",
  "order": number (1-6)
}

Slide arc:
  1. title — video title + 1-line hook
  2-3. core concepts (one per slide)
  4. real-world example or hands-on (use "two_column" or "code" if relevant)
  5. common mistakes / best practices
  6. summary — 3 key takeaways + what's next

Return ONLY the JSON array. No prose. No fences.`;

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
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    return { ok: false, error: `network: ${(e as Error).message}` };
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return { ok: false, error: `Claude ${resp.status}: ${t.slice(0, 200)}` };
  }
  const data = await resp.json();
  const text: string = data.content?.[0]?.text ?? "";
  const parsed = extractJson<Array<Record<string, unknown>>>(text, "array");
  if (!parsed.ok) {
    console.error("[generate-slides] JSON extract failed:", parsed.error);
    return { ok: false, error: parsed.error };
  }
  const slides: SlideData[] = parsed.value.map((s, i) => ({
    title: String(s.title ?? `Slide ${i + 1}`),
    content: Array.isArray(s.content) ? (s.content as unknown[]).map(String) : [String(s.content ?? "")].filter(Boolean),
    speaker_notes: String(s.speaker_notes ?? ""),
    layout_type: ((["title","content","two_column","diagram","summary","code"].includes(String(s.layout_type)))
      ? s.layout_type
      : "content") as SlideData["layout_type"],
    order: typeof s.order === "number" ? s.order : i + 1,
  }));
  return { ok: true, slides };
}

function canned(videoTitle: string): SlideData[] {
  return [
    { order: 1, title: videoTitle, content: ["Learning objectives & overview"], speaker_notes: `Welcome to ${videoTitle}.`, layout_type: "title" },
    { order: 2, title: "Core Concepts", content: ["Key definitions","Foundational principles"], speaker_notes: "Let's start with the fundamentals.", layout_type: "content" },
    { order: 3, title: "Key Principles", content: ["Essential frameworks","How they connect"], speaker_notes: "These principles set up the practical work.", layout_type: "content" },
    { order: 4, title: "Real-World Example", content: ["Concrete scenario","Step-by-step walkthrough"], speaker_notes: "Here is how this looks in practice.", layout_type: "two_column" },
    { order: 5, title: "Best Practices", content: ["Common mistakes","How to avoid them"], speaker_notes: "Watch out for these pitfalls.", layout_type: "content" },
    { order: 6, title: "Summary & Next Steps", content: ["3 key takeaways","What's next"], speaker_notes: "Recap and what comes after.", layout_type: "summary" },
  ];
}
