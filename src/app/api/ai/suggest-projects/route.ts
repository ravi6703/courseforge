// /api/ai/suggest-projects
//
// Replaces the hard-coded "AI suggested projects" list on the New Course
// wizard with a real Claude call using the title, domain, audience and
// outcome. Returns 3-5 project ideas tailored to this course; falls back to
// a small generic list when no AI provider is configured.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { hasAIProvider, aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectIdea {
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

const FALLBACK: ProjectIdea[] = [
  { title: "Capstone build",       description: "Apply every concept from the course in one end-to-end project.", difficulty: "Intermediate" },
  { title: "Case-study breakdown", description: "Pick a real-world example in this domain, dissect what worked.", difficulty: "Beginner" },
  { title: "Stretch challenge",    description: "Solve a problem one level beyond the course's stated scope.",   difficulty: "Advanced" },
];

async function suggestWithClaude(input: {
  title: string; domain?: string; audience: string; outcome?: string;
}): Promise<ProjectIdea[]> {
  const prompt = `You are a curriculum designer. Suggest 4 hands-on project ideas for the following course. Vary the difficulty (at least one Beginner, one Intermediate, one Advanced).

Course title: ${input.title}
Domain: ${input.domain ?? "general"}
Audience: ${input.audience}
${input.outcome ? `Intended outcome: ${input.outcome}` : ""}

Return STRICT JSON, no preface:
{ "projects": [{ "title": string, "description": string (1 sentence), "difficulty": "Beginner" | "Intermediate" | "Advanced" }] }`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in AI response");
  const parsed = JSON.parse(m[0]) as { projects: ProjectIdea[] };
  return parsed.projects ?? [];
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const __rl = await checkRateLimit(auth.orgId, "suggest-projects", { perMinute: 10, perDay: 200 });
  if (!__rl.ok) return rateLimitResponse(__rl);

  const body = await req.json().catch(() => ({}));
  const title: string = (body.title ?? "").toString().trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  let projects: ProjectIdea[];
  try {
    projects = hasAIProvider()
      ? await suggestWithClaude({
          title,
          domain: body.domain,
          audience: body.audience_level ?? "intermediate",
          outcome: body.outcome,
        })
      : FALLBACK;
  } catch {
    projects = FALLBACK;
  }

  return NextResponse.json({ projects }, { headers: aiHeaders(aiMode()) });
}
