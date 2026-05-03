// POST /api/ai/suggest-brief
//
// Per-brief AI suggestion. Coach types feedback like "shorten talking
// points to one line each, add a Slack-thread example", AI returns an
// improved brief structure + rationale. The UI shows it as a diff and
// the coach clicks Apply (which PATCHes the brief in the DB).
//
// Mirrors /api/ai/suggest-toc-item.
//
// Request: { lessonId, courseId, feedback }
// Response: { suggestion: { talking_points, visual_cues, key_takeaways, script_outline }, rationale }

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { extractJson } from "@/lib/ai/extract/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReqBody {
  lessonId: string;
  courseId: string;
  feedback: string;
}

interface Suggestion {
  talking_points: string[];
  visual_cues: string[];
  key_takeaways: string[];
  script_outline: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "suggest-brief", { perMinute: 30, perDay: 500 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  let body: ReqBody;
  try { body = await req.json() as ReqBody; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.lessonId || !body.courseId || !body.feedback?.trim()) {
    return NextResponse.json({ error: "lessonId, courseId, feedback required" }, { status: 400 });
  }

  const sb = await getServerSupabase();

  const { data: course } = await sb.from("courses").select("title, org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { data: lesson } = await sb
    .from("lessons")
    .select("title, modules!inner(title)")
    .eq("id", body.lessonId)
    .maybeSingle();
  if (!lesson) return NextResponse.json({ error: "lesson not found" }, { status: 404 });

  const { data: brief } = await sb
    .from("content_briefs")
    .select("talking_points, visual_cues, key_takeaways, script_outline")
    .eq("lesson_id", body.lessonId)
    .maybeSingle();
  if (!brief) return NextResponse.json({ error: "no brief to improve" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set on server" }, { status: 503 });
  }

  const prompt = `You are an expert instructional designer. Improve the following content brief based on the coach's feedback.

Course: ${course.title}
Module: ${(lesson as { modules?: { title?: string } }).modules?.title ?? ""}
Lesson: ${lesson.title}

CURRENT BRIEF:
${JSON.stringify(brief, null, 2)}

COACH FEEDBACK:
${body.feedback}

Return ONLY a JSON object with this exact shape:
{
  "suggestion": {
    "talking_points": string[],
    "visual_cues": string[],
    "key_takeaways": string[],
    "script_outline": string
  },
  "rationale": string (1-2 sentences explaining what changed and why, addressing the coach's feedback directly)
}`;

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
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
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
  const text: string = data.content?.[0]?.text ?? "";
  const parsed = extractJson<{ suggestion: Suggestion; rationale: string }>(text, "object");
  if (!parsed.ok) {
    return NextResponse.json({ error: `Could not parse Claude response: ${parsed.error}` }, { status: 502 });
  }

  return NextResponse.json(parsed.value, { headers: aiHeaders(aiMode()) });
}

// PATCH /api/ai/suggest-brief — apply a suggestion (separate verb so the
// UI can call this when the coach clicks Apply).
//
// Request: { lessonId, courseId, suggestion: Suggestion }
export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let body: { lessonId: string; courseId: string; suggestion: Suggestion };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const sb = await getServerSupabase();
  const { data: course } = await sb.from("courses").select("org_id").eq("id", body.courseId).maybeSingle();
  if (!course || course.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const { error } = await sb
    .from("content_briefs")
    .update({
      talking_points: body.suggestion.talking_points,
      visual_cues: body.suggestion.visual_cues,
      key_takeaways: body.suggestion.key_takeaways,
      script_outline: body.suggestion.script_outline,
    })
    .eq("lesson_id", body.lessonId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
