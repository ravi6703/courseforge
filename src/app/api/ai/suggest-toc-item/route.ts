import { NextRequest, NextResponse } from "next/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

interface SuggestRequest {
  courseId: string;
  itemType: "module" | "lesson";
  itemId: string;
  currentTitle: string;
  currentDescription?: string;
  feedback: string;
  courseTitle?: string;
  moduleTitle?: string;
}

interface SuggestResult {
  title: string;
  description: string;
  rationale: string;
}

function fallbackSuggest(req: SuggestRequest): SuggestResult {
  return {
    title: `${req.currentTitle} (Revised)`,
    description: req.currentDescription
      ? `${req.currentDescription} — updated based on feedback: ${req.feedback}`
      : `Updated based on feedback: ${req.feedback}`,
    rationale: "Fallback suggestion applied. Add ANTHROPIC_API_KEY for AI-powered suggestions.",
  };
}

async function suggestWithAI(req: SuggestRequest): Promise<SuggestResult> {
  const context = req.itemType === "lesson"
    ? `Module: ${req.moduleTitle ?? "Unknown"}\nLesson: ${req.currentTitle}`
    : `Module: ${req.currentTitle}`;

  const prompt = `You are an expert curriculum designer improving a course Table of Contents.

Course: ${req.courseTitle ?? "Unknown"}
Item type: ${req.itemType}
${context}
Current description: ${req.currentDescription ?? "(none)"}

Instructor feedback: "${req.feedback}"

Suggest an improved title and description for this ${req.itemType} that addresses the feedback.
Return ONLY valid JSON:
{
  "title": "improved title",
  "description": "improved description (1-2 sentences)",
  "rationale": "brief explanation of changes made"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return fallbackSuggest(req);

  const data = await response.json();
  const text: string = data.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallbackSuggest(req);

  return JSON.parse(match[0]) as SuggestResult;
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  // SEC-4: per-org rate limit
  const __rl = await checkRateLimit(auth.orgId, "suggest-toc-item");
  if (!__rl.ok) return rateLimitResponse(__rl);


  try {
    const body = (await request.json()) as SuggestRequest;

    if (body.courseId) {
      const ownership = await getServerSupabase();
      const { data: courseRow } = await ownership
        .from("courses")
        .select("org_id")
        .eq("id", body.courseId)
        .maybeSingle();
      if (!courseRow || courseRow.org_id !== auth.orgId) {
        return NextResponse.json({ error: "course not found" }, { status: 404 });
      }
    }

    const suggestion = process.env.ANTHROPIC_API_KEY
      ? await suggestWithAI(body)
      : fallbackSuggest(body);

    // Persist accepted suggestion as a comment for audit trail
    if (body.courseId && body.itemId) {
      const supabase = await getServerSupabase();
      await supabase.from("comments").insert({
        course_id: body.courseId,
        target_type: body.itemType,
        target_id: body.itemId,
        text: `AI suggestion (feedback: "${body.feedback}")\nSuggested title: ${suggestion.title}\nRationale: ${suggestion.rationale}`,
        author_name: "AI Assistant",
        author_role: "ai",
        is_ai_flag: true,
        resolved: false,
      });
    }

    return NextResponse.json(
      { success: true, suggestion },
      { headers: aiHeaders(aiMode()) }
    );
  } catch (err) {
    console.error("suggest-toc-item error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate suggestion" },
      { status: 500, headers: aiHeaders(aiMode()) }
    );
  }
}
