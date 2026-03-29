import { NextRequest, NextResponse } from "next/server";
import { GeneratedTOC, Module, Lesson, Video, LearningObjective, CourseResearch, ContentType } from "@/types";

interface GenerateTOCRequest {
  title: string;
  description: string;
  platform: string;
  audience_level: string;
  duration_weeks: number;
  hours_per_week: number;
  domain: string;
  target_job_roles: string[];
  content_types: ContentType[];
  theory_handson_ratio: number;
  project_based: boolean;
  capstone: boolean;
  reference_course_url: string;
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

function generateFallbackTOC(input: GenerateTOCRequest): GeneratedTOC {
  const moduleCount = Math.ceil(input.duration_weeks / 2);
  const modules: Module[] = [];

  for (let m = 0; m < moduleCount; m++) {
    const lessons: Lesson[] = [];
    const lessonsPerModule = Math.ceil(input.hours_per_week / 2);

    for (let l = 0; l < lessonsPerModule; l++) {
      const videos: Video[] = [];
      const videosPerLesson = 2;

      for (let v = 0; v < videosPerLesson; v++) {
        videos.push({
          id: `video-${m}-${l}-${v}`,
          lesson_id: `lesson-${m}-${l}`,
          title: `${input.domain} - Part ${v + 1}`,
          duration_minutes: 15,
          order: v,
          is_handson: input.theory_handson_ratio < 50 && v === videosPerLesson - 1,
          status: "pending",
        });
      }

      lessons.push({
        id: `lesson-${m}-${l}`,
        module_id: `module-${m}`,
        title: `Lesson ${l + 1}: Key Concepts`,
        description: `Learning key concepts in ${input.domain}`,
        order: l,
        learning_objectives: generateLearningObjectives(`${input.domain} concepts`),
        content_types: input.content_types,
        videos,
      });
    }

    modules.push({
      id: `module-${m}`,
      course_id: "temp-course-id",
      title: `Module ${m + 1}: ${input.domain} Fundamentals`,
      description: `Foundation module covering core ${input.domain} principles`,
      duration_hours: input.hours_per_week,
      order: m,
      is_capstone: input.capstone && m === moduleCount - 1,
      is_project_milestone: input.project_based && m > 0 && m % 2 === 0,
      learning_objectives: generateLearningObjectives(input.domain, 4),
      lessons,
    });
  }

  return {
    course_title: input.title,
    course_description: input.description,
    course_learning_objectives: generateLearningObjectives(input.title, 5),
    modules,
  };
}

function generateFallbackResearch(input: GenerateTOCRequest): CourseResearch {
  const domains = input.domain.toLowerCase().split(" ");
  const keyword = domains[0];

  return {
    id: `research-${Date.now()}`,
    course_id: "temp-course-id",
    competitor_courses: [
      {
        name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Basics on Coursera`,
        platform: "coursera",
        rating: 4.6,
        url: "https://www.coursera.org",
        duration: `${input.duration_weeks} weeks`,
      },
      {
        name: `Complete ${input.domain} Masterclass`,
        platform: "udemy",
        rating: 4.7,
        url: "https://www.udemy.com",
        duration: `${input.duration_weeks + 2} weeks`,
      },
      {
        name: `${input.domain} Professional Certificate`,
        platform: "coursera",
        rating: 4.5,
        url: "https://www.coursera.org",
        duration: `${input.duration_weeks - 1} weeks`,
      },
    ],
    curriculum_gaps: [
      `Advanced ${keyword} optimization techniques`,
      "Real-world case studies",
      "Integration with modern tools",
      "Industry best practices",
    ],
    job_market_skills: input.target_job_roles.map((role) => `${role} specific skills`),
    industry_trends: [
      `Rising demand for ${keyword} professionals`,
      "Shift towards project-based learning",
      "Integration of AI tools in workflows",
      "Focus on practical hands-on experience",
    ],
    best_existing_course: {
      name: `Complete ${input.domain} Masterclass`,
      platform: "udemy",
      rating: 4.7,
      why_best: "Comprehensive coverage with strong community support",
    },
    why_better: [
      "More comprehensive curriculum aligned with current job market",
      "Stronger focus on hands-on projects and real-world applications",
      "Better instructor-to-student ratio and support",
      "Updated content reflecting latest industry practices",
    ],
    positioning_statement: `Our ${input.domain} course stands out by combining rigorous theory with practical, project-based learning, designed specifically for professionals targeting ${input.target_job_roles[0]} roles.`,
    sources: [
      {
        title: "Job Market Analysis Report",
        url: "https://www.linkedin.com/jobs",
        type: "job_board",
      },
      {
        title: "Industry Trends Report",
        url: "https://www.gartner.com",
        type: "research",
      },
      {
        title: "Competitor Course Reviews",
        url: "https://www.coursera.org",
        type: "competitor_analysis",
      },
    ],
    created_at: new Date().toISOString(),
  };
}

async function generateWithAI(input: GenerateTOCRequest): Promise<GeneratedTOC> {
  const systemPrompt = `You are an expert curriculum designer. Generate a comprehensive Table of Contents for an online course in JSON format matching the GeneratedTOC interface.

The course has these specifications:
- Title: ${input.title}
- Description: ${input.description}
- Domain: ${input.domain}
- Duration: ${input.duration_weeks} weeks, ${input.hours_per_week} hours/week
- Audience Level: ${input.audience_level}
- Target Roles: ${input.target_job_roles.join(", ")}
- Theory/Hands-on Ratio: ${input.theory_handson_ratio}% theory
- Project-based: ${input.project_based}
- Include Capstone: ${input.capstone}
- Content Types: ${input.content_types.join(", ")}

Create modules with:
1. Learning objectives aligned to Bloom's Taxonomy
2. Lessons with multiple videos and content items
3. Consider the theory/hands-on ratio in video types
4. Include project milestones if project_based is true
5. Include a capstone module if capstone is true

For each video, set is_handson=true for hands-on content based on the ratio.

Return ONLY valid JSON matching this structure:
{
  "course_title": string,
  "course_description": string,
  "course_learning_objectives": [{ id, text, bloom_level }],
  "modules": [{
    id, course_id, title, description, duration_hours, order, is_capstone, is_project_milestone,
    learning_objectives: [{ id, text, bloom_level }],
    lessons: [{
      id, module_id, title, description, order, learning_objectives, content_types,
      videos: [{ id, lesson_id, title, duration_minutes, order, is_handson, status }]
    }]
  }]
}`;

  const prompt = systemPrompt;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return generateFallbackTOC(input);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackTOC(input);
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedTOC;

    // Ensure all objects have required IDs and fields
    parsed.modules.forEach((m) => {
      m.course_id ||= "temp-course-id";
      m.id ||= `module-${Math.random().toString(36).substr(2, 9)}`;
      m.lessons.forEach((l) => {
        l.module_id ||= m.id;
        l.id ||= `lesson-${Math.random().toString(36).substr(2, 9)}`;
        l.videos.forEach((v) => {
          v.lesson_id ||= l.id;
          v.id ||= `video-${Math.random().toString(36).substr(2, 9)}`;
        });
      });
    });

    return parsed;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackTOC(input);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateTOCRequest;

    const toc = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackTOC(body);

    const research = generateFallbackResearch(body);
    toc.research = research;

    return NextResponse.json({ toc, research });
  } catch (error) {
    console.error("Error in /api/generate-toc:", error);
    return NextResponse.json(
      { error: "Failed to generate TOC" },
      { status: 500 }
    );
  }
}
