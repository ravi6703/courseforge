import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { research } from "@/lib/research";
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
async function generateWithAI(input: GenerateTOCRequest): Promise<Module[]> {
  const systemPrompt = `You are an expert curriculum designer specializing in creating comprehensive online courses. Your task is to generate a detailed Table of Contents for a course with specific requirements.

COURSE SPECIFICATIONS:
- Title: ${input.title}
- Description: ${input.description}
- Platform: ${input.platform}
- Domain: ${input.domain}
- Duration: ${input.duration_weeks} weeks, ${input.hours_per_week} hours per week
- Total Duration: ${input.duration_weeks * input.hours_per_week} hours
- Audience Level: ${input.audience_level}
- Prerequisites: ${input.prerequisites || "None specified"}
- Target Job Roles: ${input.target_job_roles.join(", ")}
- Certification Goal: ${input.certification_goal || "Professional competency"}
- Theory/Hands-on Ratio: ${input.theory_handson_ratio}% theory, ${100 - input.theory_handson_ratio}% hands-on
- Project-Based Learning: ${input.project_based ? "Yes" : "No"}
- Include Capstone Project: ${input.capstone ? "Yes" : "No"}
- Supported Content Types: ${input.content_types.join(", ")}
${input.reference_course_url ? `- Reference Course: ${input.reference_course_url}` : ""}

CURRICULUM DESIGN REQUIREMENTS:
1. Create 4-6 modules that build progressively in complexity
2. Each module should have 2-4 lessons based on the course duration
3. Each lesson must include 2-3 videos or content items
4. Align all learning objectives to Bloom's Taxonomy (remember, understand, apply, analyze, evaluate, create)
5. Incorporate the theory/hands-on ratio throughout the course
6. Include project milestones every 1-2 modules if project_based is true
7. Include a capstone module at the end if capstone is true
8. Ensure hands-on content matches the specified ratio
9. Design lessons to fit the ${input.hours_per_week} hours per week pace
10. Make content relevant to the target job roles: ${input.target_job_roles.join(", ")}

RESPONSE FORMAT:
Return ONLY a valid JSON array of modules. Each module must follow this exact structure:
[
  {
    "id": "module-{number}",
    "course_id": "temp-course-id",
    "title": "Module Title",
    "description": "Detailed module description",
    "duration_hours": {calculated based on weekly hours},
    "order": {0-indexed},
    "is_capstone": {boolean},
    "is_project_milestone": {boolean},
    "learning_objectives": [
      {
        "id": "lo-{unique-id}",
        "text": "Specific learning outcome using action verb",
        "bloom_level": "remember|understand|apply|analyze|evaluate|create"
      }
    ],
    "lessons": [
      {
        "id": "lesson-{unique-id}",
        "module_id": "module-{number}",
        "title": "Lesson Title",
        "description": "Lesson description",
        "order": {0-indexed},
        "content_items": [
          {
            "id": "content-{unique-id}",
            "lesson_id": "lesson-{unique-id}",
            "type": "${input.content_types[0] || "video"}",
            "title": "Content Item Title",
            "description": "What students will learn",
            "duration": {minutes},
            "order": {0-indexed}
          }
        ],
        "videos": [
          {
            "id": "video-{unique-id}",
            "lesson_id": "lesson-{unique-id}",
            "title": "Video Title",
            "duration_minutes": {15-30},
            "order": {0-indexed},
            "is_handson": ${input.theory_handson_ratio < 50 ? "true or false based on ratio" : "false"},
            "status": "pending"
          }
        ]
      }
    ]
  }
]

IMPORTANT:
- Make all IDs unique and properly formatted
- Ensure the structure matches exactly - no extra or missing fields
- Return ONLY the JSON array, no markdown, no explanation
- Duration should realistically fit the ${input.duration_weeks} week schedule
- For videos with is_handson=true, ensure duration_minutes reflects hands-on exercises`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: systemPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status, response.statusText);
      return generateFallbackTOC(input);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("Could not extract JSON array from Claude response");
      return generateFallbackTOC(input);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Module[];

    // Ensure all objects have required IDs and fields
    parsed.forEach((module) => {
      module.course_id ||= "temp-course-id";
      module.id ||= `module-${Math.random().toString(36).substr(2, 9)}`;
      module.learning_objectives ||= generateLearningObjectives(module.title, 3);

      module.lessons ||= [];
      module.lessons.forEach((lesson) => {
        lesson.module_id ||= module.id;
        lesson.id ||= `lesson-${Math.random().toString(36).substr(2, 9)}`;
        lesson.learning_objectives ||= generateLearningObjectives(lesson.title, 2);

        const lessonAny = lesson as unknown as { content_items?: Array<{ id?: string; lesson_id?: string }> };
        lessonAny.content_items ||= [];
        lessonAny.content_items.forEach((item) => {
          item.lesson_id ||= lesson.id;
          item.id ||= `content-${Math.random().toString(36).substr(2, 9)}`;
        });

        lesson.videos ||= [];
        lesson.videos.forEach((video) => {
          video.lesson_id ||= lesson.id;
          video.id ||= `video-${Math.random().toString(36).substr(2, 9)}`;
          video.status ||= "pending";
        });
      });
    });

    return parsed;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackTOC(input);
  }
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

    const modules = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackTOC(body);

    const researchResult = await research({
      domain: body.domain,
      title: body.title,
      target_job_roles: body.target_job_roles ?? [],
      audience_level: body.audience_level,
    });

    const response: GenerateTOCResponse = {
      success: true,
      modules,
      research: {
        sources: researchResult.sources.map((s) => `${s.title} — ${s.url}`),
        competitors: researchResult.competitors,
        research_steps: researchResult.research_steps,
      },
    };

    return NextResponse.json(response, { headers: aiHeaders(aiMode()) });
  } catch (error) {
    console.error("Error in /api/generate-toc:", error);
    return NextResponse.json({ error: "Failed to generate table of contents" }, { status: 500, headers: aiHeaders(aiMode()) });
  }
}
