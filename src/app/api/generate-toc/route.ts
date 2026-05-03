import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { research } from "@/lib/research";
import { fewShotBlock } from "@/lib/ai/prompts/toc-fewshot";
import { extractJson } from "@/lib/ai/extract/json";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { GeneratedTOC, Module, Lesson, Video, LearningObjective, CourseResearch, ContentType } from "@/types";

interface GenerateTOCRequest {
  title: string;
  description: string;
  platform: string;
  audience_level: string;
  duration_weeks: number;
  hours_per_week: number;
  domain: string;
  prerequisites?: string;
  target_job_roles: string[];
  content_types: ContentType[];
  theory_handson_ratio: number;
  project_based: boolean;
  capstone: boolean;
  certification_goal?: string;
  reference_course_url?: string;
}

interface GenerateTOCResponse {
  success: boolean;
  modules: Module[];
  research: {
    sources: string[];
    competitors: Array<{
      name: string;
      url: string;
      rating?: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    research_steps: Array<{
      label: string;
      description: string;
      status: "pending" | "completed" | "in_progress";
    }>;
  };
}

function generateLearningObjectives(topic: string, count: number = 3): LearningObjective[] {
  const bloomLevels: Array<"remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"> = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ];
  const objectives: LearningObjective[] = [];

  for (let i = 0; i < count; i++) {
    const verbs = ["identify", "explain", "implement", "analyze", "evaluate", "design"];
    objectives.push({
      id: `lo-${Date.now()}-${i}`,
      text: `${verbs[i % verbs.length]} ${topic.toLowerCase()}`,
      bloom_level: bloomLevels[i % bloomLevels.length],
    });
  }

  return objectives;
}

function generateFallbackTOC(input: GenerateTOCRequest): Module[] {
  const moduleCount = Math.max(4, Math.ceil(input.duration_weeks / 2));
  const modules: Module[] = [];

  const moduleTitles = [
    "Foundations & Core Concepts",
    "Intermediate Principles & Applications",
    "Advanced Techniques & Best Practices",
    "Real-World Projects & Case Studies",
    "Capstone & Professional Integration",
  ];

  for (let m = 0; m < moduleCount; m++) {
    const lessons: Lesson[] = [];
    const lessonsPerModule = Math.ceil(input.hours_per_week / 2);

    for (let l = 0; l < lessonsPerModule; l++) {
      const contentItems: any[] = [];

      // Generate content items based on content types
      input.content_types.forEach((contentType, idx) => {
        contentItems.push({
          id: `content-${m}-${l}-${idx}`,
          lesson_id: `lesson-${m}-${l}`,
          type: contentType,
          title: `${contentType} Resource ${idx + 1}`,
          description: `${contentType} material for ${input.domain}`,
          duration: 10 + idx * 5,
          order: idx,
          status: "pending",
        });
      });

      const videos: Video[] = [];
      const videosPerLesson = 2;

      for (let v = 0; v < videosPerLesson; v++) {
        const isHandsOn = input.theory_handson_ratio < 50 && v === videosPerLesson - 1;
        videos.push({
          id: `video-${m}-${l}-${v}`,
          org_id: "00000000-0000-0000-0000-0000000000aa",
          course_id: "draft-course",
          lesson_id: `lesson-${m}-${l}`,
          title: `${input.domain} - ${isHandsOn ? "Hands-on" : "Theory"} Part ${v + 1}`,
          duration_minutes: 20,
          order: v,
          is_handson: isHandsOn,
          status: "pending",
        });
      }

      lessons.push({
        id: `lesson-${m}-${l}`,
        org_id: "00000000-0000-0000-0000-0000000000aa",
        course_id: "draft-course",
        module_id: `module-${m}`,
        title: `Lesson ${l + 1}: ${moduleTitles[m]?.split("&")[0] || "Key Concepts"}`,
        description: `Learning outcomes in ${input.domain} - ${moduleTitles[m] || "Module Content"}`,
        order: l,
        learning_objectives: [
          { id: `lo-${m}-${l}-1`, text: `Understand core concepts of ${moduleTitles[m] || input.domain}`, bloom_level: "understand" as const },
          { id: `lo-${m}-${l}-2`, text: `Apply ${moduleTitles[m] || input.domain} techniques`, bloom_level: "apply" as const },
        ],
        content_types: input.content_types,
        content_items: contentItems,
        videos,
      } as any);
    }

    const isCapstoneMod = input.capstone && m === moduleCount - 1;
    const isProjectMod = input.project_based && m > 0 && m < moduleCount - 1;

    modules.push({
      id: `module-${m}`,
      org_id: "00000000-0000-0000-0000-0000000000aa",
      course_id: "temp-course-id",
      title: `Module ${m + 1}: ${moduleTitles[m] || input.domain}`,
      description: isCapstoneMod
        ? `Capstone project integrating all ${input.domain} knowledge`
        : isProjectMod
          ? `Project-based module applying ${input.domain} concepts`
          : `Foundation module covering core ${input.domain} principles`,
      duration_hours: input.hours_per_week * 2,
      order: m,
      is_capstone: isCapstoneMod,
      is_project_milestone: isProjectMod,
      learning_objectives: generateLearningObjectives(moduleTitles[m] || input.domain, 4),
      lessons,
    });
  }

  return modules;
}

// generateFallbackResearch removed — provider-aware research lives in src/lib/research.
async function generateWithAI(input: GenerateTOCRequest): Promise<{ ok: true; modules: Module[] } | { ok: false; error: string; raw?: string }> {
  const fewShot = fewShotBlock();

  const systemPrompt = `You are an expert curriculum designer for Board Infinity. Your task is to generate a detailed, production-ready Table of Contents for an online course.

COURSE SPECIFICATIONS:
- Title: ${input.title}
- Description: ${input.description}
- Platform: ${input.platform}
- Domain: ${input.domain}
- Duration: ${input.duration_weeks} weeks, ${input.hours_per_week} hours per week (total ${input.duration_weeks * input.hours_per_week} hours)
- Audience Level: ${input.audience_level}
- Prerequisites: ${input.prerequisites || "None specified"}
- Target Job Roles: ${input.target_job_roles.length ? input.target_job_roles.join(", ") : "general practitioners in the field"}
- Certification Goal: ${input.certification_goal || "Professional competency"}
- Theory/Hands-on Ratio: ${input.theory_handson_ratio}% theory / ${100 - input.theory_handson_ratio}% hands-on
- Project-Based: ${input.project_based ? "Yes — weave milestone projects into modules" : "No"}
- Capstone: ${input.capstone ? "Yes — final module is a capstone with deliverables + rubric" : "No"}
- Content Types Allowed: ${input.content_types.join(", ")}
${input.reference_course_url ? `- Reference Course (use as inspiration, do NOT copy): ${input.reference_course_url}` : ""}

CURRICULUM DESIGN RULES:
1. Generate 4–6 modules that build progressively in complexity.
2. Each module: 2–4 lessons, distinctive titles, ${input.hours_per_week * 2}–${input.hours_per_week * 3} duration_hours total per module on average.
3. Each lesson: 2–3 videos (10–25 min each) + 1–2 content_items chosen ONLY from the allowed types above.
4. Learning objectives align to Bloom's Taxonomy. First module skews remember/understand; last module skews analyze/evaluate/create.
5. Hands-on videos (is_handson=true) match the configured ratio.
6. Module + lesson titles MUST be specific to "${input.domain}" — never generic placeholders like "Foundations" or "Advanced Techniques". Use the actual concepts, tools, frameworks, and job tasks of the domain.
7. Module + lesson DESCRIPTIONS are 1–3 concrete sentences. Never reuse a description across modules.

REFERENCE EXAMPLES (style + density to match — do NOT copy content):

${fewShot}

OUTPUT FORMAT:
Return ONLY a valid JSON array of modules — no markdown, no commentary. Each module exactly:
[
  {
    "id": "module-{n}",
    "course_id": "temp-course-id",
    "title": "Specific Module Title",
    "description": "Concrete 1-3 sentence description.",
    "duration_hours": ${Math.max(2, Math.round(input.hours_per_week * 2))},
    "order": 0,
    "is_capstone": false,
    "is_project_milestone": false,
    "learning_objectives": [
      { "id": "lo-{unique}", "text": "Action-verb objective", "bloom_level": "understand" }
    ],
    "lessons": [
      {
        "id": "lesson-{unique}",
        "module_id": "module-{n}",
        "title": "Specific Lesson Title",
        "description": "What learners will be able to do after this lesson.",
        "order": 0,
        "content_items": [
          { "id": "content-{unique}", "lesson_id": "lesson-{unique}", "type": "${input.content_types[0] || "reading"}", "title": "Specific item title", "description": "Brief", "duration": 15, "order": 0 }
        ],
        "videos": [
          { "id": "video-{unique}", "lesson_id": "lesson-{unique}", "title": "Specific Video Title", "duration_minutes": 12, "order": 0, "is_handson": false, "status": "pending" }
        ]
      }
    ]
  }
]

ABSOLUTE: Output starts with [ and ends with ]. No prose, no fences, no comments.`;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,                     // bumped from 8000 — TOCs got truncated
        messages: [{ role: "user", content: systemPrompt }],
      }),
    });
  } catch (e) {
    return { ok: false, error: `network error: ${(e as Error).message}` };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("[generate-toc] Claude HTTP", response.status, errText.slice(0, 500));
    return { ok: false, error: `Claude returned ${response.status}: ${errText.slice(0, 200)}` };
  }

  const data = await response.json();
  const content: string = data.content?.[0]?.text ?? "";

  // Robust JSON extraction (handles ```json fences, trailing prose, etc.)
  const parsed = extractJson<Module[]>(content, "array");
  if (!parsed.ok) {
    console.error("[generate-toc] JSON extract failed:", parsed.error);
    console.error("[generate-toc] Claude raw response (first 500 chars):", content.slice(0, 500));
    return { ok: false, error: `Could not parse Claude's response as JSON: ${parsed.error}`, raw: content.slice(0, 1000) };
  }

  // Backfill any missing IDs Claude omitted, defensively.
  const modules = parsed.value;
  modules.forEach((module, mi) => {
    module.course_id ||= "temp-course-id";
    module.id ||= `module-${mi}-${Math.random().toString(36).slice(2, 9)}`;
    module.learning_objectives ||= generateLearningObjectives(module.title, 3);
    module.lessons ||= [];
    module.lessons.forEach((lesson, li) => {
      lesson.module_id ||= module.id;
      lesson.id ||= `lesson-${mi}-${li}-${Math.random().toString(36).slice(2, 9)}`;
      lesson.learning_objectives ||= generateLearningObjectives(lesson.title, 2);
      const lessonAny = lesson as unknown as { content_items?: Array<{ id?: string; lesson_id?: string }> };
      lessonAny.content_items ||= [];
      lessonAny.content_items.forEach((item, ii) => {
        item.lesson_id ||= lesson.id;
        item.id ||= `content-${mi}-${li}-${ii}-${Math.random().toString(36).slice(2, 6)}`;
      });
      lesson.videos ||= [];
      lesson.videos.forEach((video, vi) => {
        video.lesson_id ||= lesson.id;
        video.id ||= `video-${mi}-${li}-${vi}-${Math.random().toString(36).slice(2, 6)}`;
        video.status ||= "pending";
      });
    });
  });

  return { ok: true, modules };
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  // SEC-4: per-org rate limit
  const __rl = await checkRateLimit(auth.orgId, "generate-toc");
  if (!__rl.ok) return rateLimitResponse(__rl);

    const body = (await request.json()) as GenerateTOCRequest;

    // Validate required fields
    if (!body.title || !body.description || !body.domain) {
      return NextResponse.json({ error: "Missing required fields: title, description, domain" }, { status: 400, headers: aiHeaders(aiMode()) });
    }

    let modules;
    let aiError: string | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
      const result = await generateWithAI(body);
      if (result.ok) {
        modules = result.modules;
      } else {
        // No more silent fallback — return the AI error so the UI can show it.
        // The user explicitly opted into live generation by setting the key;
        // if Claude breaks, they need to know, not see canned templates.
        aiError = result.error;
        modules = generateFallbackTOC(body);
      }
    } else {
      modules = generateFallbackTOC(body);
    }

    const researchResult = await research({
      domain: body.domain,
      title: body.title,
      target_job_roles: body.target_job_roles ?? [],
      audience_level: body.audience_level,
    });

    const response: GenerateTOCResponse & { ai_error?: string } = {
      success: true,
      modules,
      research: {
        sources: researchResult.sources.map((s) => `${s.title} — ${s.url}`),
        competitors: researchResult.competitors,
        research_steps: researchResult.research_steps,
      },
    };
    if (aiError) response.ai_error = aiError;

    const headers = aiHeaders(aiMode());
    if (aiError) headers["x-cf-ai-mode"] = "fallback-after-error";

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error("Error in /api/generate-toc:", error);
    return NextResponse.json({ error: "Failed to generate table of contents" }, { status: 500, headers: aiHeaders(aiMode()) });
  }
}
