// POST /api/ai/generate-brief
//
// Phase 1 of the Phase Unit Consistency spec: briefs are per VIDEO.
// Lessons map to multiple videos; previously we had 1 brief per lesson which
// caused the brief count ≠ PPT count discrepancy users hit in pilot.
//
// Request: { videoId: uuid, courseId: uuid, coachInput?: {…} }
// Response: { success, brief: { …, status: "draft" } }

import { NextRequest, NextResponse } from "next/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { extractJson } from "@/lib/ai/extract/json";
import { recordActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReqBody {
  videoId: string;
  courseId: string;
  coachInput?: {
    key_topics?: string;
    examples?: string;
    visual_requirements?: string;
    difficulty_notes?: string;
    references?: string;
    slide_count?: number;
    estimated_minutes?: number;
  };
}

interface BriefShape {
  talking_points: string[];
  visual_cues: string[];
  key_takeaways: string[];
  script_outline: string;
  estimated_duration: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "generate-brief");
  if (!__rl.ok) return rateLimitResponse(__rl);

  let body: ReqBody;
  try { body = (await req.json()) as ReqBody; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.videoId || !body.courseId) {
    return NextResponse.json({ error: "videoId and courseId required" }, { status: 400 });
  }

  const sb = await getServerSupabase();

  // Ownership + context fetch
  const { data: course } = await sb.from("courses").select("title, org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: video } = await sb
    .from("videos")
    .select("id, title, lesson_id, lessons!inner(title, modules!inner(title))")
    .eq("id", body.videoId)
    .maybeSingle();
  if (!video) return NextResponse.json({ error: "video not found" }, { status: 404 });

  const lesson = (video as { lessons?: { title?: string; modules?: { title?: string } } }).lessons;

  // Generate
  let brief: BriefShape;
  let aiError: string | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    const r = await generateWithClaude({
      courseTitle: course.title,
      moduleTitle: lesson?.modules?.title ?? "",
      lessonTitle: lesson?.title ?? "",
      videoTitle: video.title,
      coachInput: body.coachInput,
    });
    if (r.ok) brief = r.brief;
    else { aiError = r.error; brief = canned(video.title); }
  } else {
    brief = canned(video.title);
  }

  // Upsert (video_id UNIQUE → 1 brief per video)
  const row = {
    video_id: video.id,
    lesson_id: video.lesson_id,
    course_id: body.courseId,
    org_id: auth.orgId,
    talking_points: brief.talking_points,
    visual_cues: brief.visual_cues,
    key_takeaways: brief.key_takeaways,
    script_outline: brief.script_outline,
    estimated_duration: brief.estimated_duration,
    coach_slide_count: body.coachInput?.slide_count ?? null,
    coach_estimated_minutes: body.coachInput?.estimated_minutes ?? null,
    status: "draft" as const,
    approved_at: null,
    approved_by: null,
  };
  const { data: saved, error: upErr } = await sb
    .from("content_briefs")
    .upsert(row, { onConflict: "video_id" })
    .select("id, status")
    .single();
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await recordActivity(sb, {
    orgId: auth.orgId, userId: auth.profileId, userName: auth.email ?? undefined, userRole: auth.role,
    courseId: body.courseId,
    action: "brief.generated",
    targetType: "video",
    targetId: video.id,
    details: { videoTitle: video.title },
  });

  const headers = aiHeaders(aiMode());
  if (aiError) headers["x-cf-ai-mode"] = "fallback-after-error";

  return NextResponse.json({
    success: true,
    brief: { ...brief, status: saved.status, id: saved.id },
    ai_error: aiError ?? undefined,
  }, { headers });
}

interface ClaudeIn {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  videoTitle: string;
  coachInput?: ReqBody["coachInput"];
}

async function generateWithClaude(input: ClaudeIn): Promise<{ ok: true; brief: BriefShape } | { ok: false; error: string }> {
  const ci = input.coachInput;
  const coach = ci && Object.values(ci).some((v) => (typeof v === "string" ? v.trim() : v != null))
    ? `\n\nCOACH INPUT:\n${JSON.stringify(ci, null, 2)}\n\nCONSTRAINTS: ${ci.slide_count ? `target ${ci.slide_count} slides` : "slide count not specified"}, ${ci.estimated_minutes ? `target ${ci.estimated_minutes} minutes` : "duration not specified"}.`
    : "";

  const prompt = `You are an expert instructional designer. Generate a content brief for a single video lesson.

Course: ${input.courseTitle}
Module: ${input.moduleTitle}
Lesson: ${input.lessonTitle}
Video: ${input.videoTitle}${coach}

Return ONLY a JSON object with this shape:
{
  "talking_points": string[]   (5-10 specific points, action-verbs)
  "visual_cues": string[]      (3-6 concrete visual ideas — diagrams, code, animations)
  "key_takeaways": string[]    (3-5 outcomes the learner walks away with)
  "script_outline": string     (timestamp-style 6-8 lines, e.g. "[0:00-0:30] Hook")
  "estimated_duration": string (e.g. "8-10 minutes")
}

No prose, no markdown fences.`;

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
        max_tokens: 2000,
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
  const parsed = extractJson<BriefShape>(text, "object");
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  // Defensive defaults
  const v = parsed.value;
  return {
    ok: true,
    brief: {
      talking_points: Array.isArray(v.talking_points) ? v.talking_points.map(String) : [],
      visual_cues: Array.isArray(v.visual_cues) ? v.visual_cues.map(String) : [],
      key_takeaways: Array.isArray(v.key_takeaways) ? v.key_takeaways.map(String) : [],
      script_outline: String(v.script_outline ?? ""),
      estimated_duration: String(v.estimated_duration ?? "8-10 minutes"),
    },
  };
}

function canned(videoTitle: string): BriefShape {
  return {
    talking_points: [`Overview of ${videoTitle}`, "Core concepts and definitions", "Key principles and theories", "Practical applications"],
    visual_cues: ["Animated diagrams showing concept flow", "Code snippets with syntax highlighting", "Before/after comparison visuals", "Key terms highlighted in bold"],
    key_takeaways: [`By the end, learners will understand the core concepts of ${videoTitle}`, "Apply learned principles to practical scenarios", "Identify common mistakes and how to avoid them"],
    script_outline: "[0:00-0:30] Introduction & Learning Goals\n[0:30-3:00] Core Concept Explanation\n[3:00-5:00] First Example & Walkthrough\n[5:00-7:00] Second Example & Application\n[7:00-8:00] Common Mistakes & Best Practices\n[8:00-8:30] Summary & Next Steps",
    estimated_duration: "8-10 minutes",
  };
}
