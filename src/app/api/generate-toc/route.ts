import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TOCRequest {
  title: string;
  description: string;
  platform: string;
  audience_level: string;
  duration_weeks: number;
  content_types: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: TOCRequest = await req.json();
    const { title, description, platform, audience_level, duration_weeks, content_types } = body;

    // If no OpenAI key, use built-in generation
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "your-openai-key") {
      const toc = generateFallbackTOC(body);
      return NextResponse.json({ success: true, modules: toc });
    }

    // Call OpenAI GPT-4o
    const systemPrompt = `You are CourseForge AI — an expert instructional designer for Board Infinity / InfyLearn. You create Bloom's Taxonomy-aligned course TOCs that match Board Infinity's exact format.

BOARD INFINITY TOC FORMAT RULES:
1. Module naming: "Module [#] - [Title]" (use dash, not colon)
2. Lesson naming: "Lesson [Module#].[Lesson#] - [Title]" (e.g. "Lesson 1.1 - Introduction to the Course")
3. Each module has: duration (hrs/min), description paragraph, 3-4 numbered learning objectives, 3-4 lessons
4. Learning objectives use action verbs: Define, Explain, Identify, Apply, Implement, Analyze, Evaluate, Create, Build, Demonstrate, Assess, Differentiate, Compare, Synthesize, Formulate
5. Every learning objective MUST have a bloom_level from: remember, understand, apply, analyze, evaluate, create
6. Bloom levels PROGRESS across modules: early → remember/understand, middle → apply/analyze, later → evaluate/create

CONTENT TYPE PLACEMENT (Board Infinity Standard):
- Videos: 1-3 per lesson, titled descriptively (e.g. "What is [Topic]?", "Demo - [Task]", "Hands-On: [Activity]"), durations 5-20 min each
- Reading: "Read More About [Topic]" or "Learn More about [Topic]" or "Further Reads on [Topic]", 15-30 min
- Discussion Prompt: appears in Module 1 Lesson 1 and first lesson of each module, 5-10 min
- Practice Quiz (practice_quiz): "Practice Quiz: [Topic Name]", 30 min, end of most lessons
- Graded Quiz (graded_quiz): "Graded Quiz: [Module Title]", 1 hr, last lesson of each module ONLY
- Glossary: Module 1, Lesson 1 ONLY
- Case Study: later modules (Module 2+), applied learning scenarios
- Ungraded Plugin: "Quick Course Check-In", 15 min, optional end of module
- AI Dialogue: interactive dialogue items, sprinkled in intermediate lessons

STRUCTURE:
- Generate ${Math.max(3, Math.min(6, duration_weeks))} modules total
- 3-4 lessons per module
- Module 1 always starts with a "Course Introduction" or "Introduction to [Topic]" lesson
- Final module has a capstone or synthesis lesson
- Platform "${platform}" context: ${getPlatformContext(platform)}
- Audience level "${audience_level}": ${getAudienceContext(audience_level)}

Respond with valid JSON only. No markdown, no explanation.`;

    const userPrompt = `Create a TOC for:
Title: ${title}
Description: ${description}
Platform: ${platform}
Audience: ${audience_level}
Duration: ${duration_weeks} weeks
Content Types Available: ${content_types.join(", ")}

Return a JSON array of modules with this exact structure:
[
  {
    "title": "Module 1: ...",
    "description": "...",
    "order": 1,
    "learning_objectives": [
      { "text": "...", "bloom_level": "understand" }
    ],
    "lessons": [
      {
        "title": "...",
        "description": "...",
        "order": 1,
        "learning_objectives": [
          { "text": "...", "bloom_level": "remember" }
        ],
        "content_types": ["reading", "glossary", "practice_quiz"],
        "videos": [
          { "title": "...", "duration_minutes": 12, "order": 1 }
        ]
      }
    ]
  }
]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      // Fall back to built-in generation
      const toc = generateFallbackTOC(body);
      return NextResponse.json({ success: true, modules: toc, fallback: true });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      const toc = generateFallbackTOC(body);
      return NextResponse.json({ success: true, modules: toc, fallback: true });
    }

    let parsed = JSON.parse(content);
    // Handle case where GPT wraps in { "modules": [...] }
    if (parsed.modules && Array.isArray(parsed.modules)) {
      parsed = parsed.modules;
    }

    // Add IDs and status to the parsed modules
    const modules = enrichModules(parsed);

    return NextResponse.json({ success: true, modules });
  } catch (error) {
    console.error("TOC generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate TOC" },
      { status: 500 }
    );
  }
}

function getPlatformContext(platform: string): string {
  const ctx: Record<string, string> = {
    coursera: "Coursera-style: modules map to weeks, each lesson has readings + videos + quiz, peer-graded assignments in later modules",
    udemy: "Udemy-style: sections with short punchy lectures (8-15 min), lots of practice exercises, certificate-focused",
    infylearn: "InfyLearn (Board Infinity): structured modules with weekly pacing, industry-relevant case studies, mentor-led discussions",
    university: "University-style: semester pacing, academic rigor, research-oriented assignments, peer discussion forums",
    custom: "Flexible format: balance between theory and practice",
  };
  return ctx[platform] || ctx.custom;
}

function getAudienceContext(level: string): string {
  const ctx: Record<string, string> = {
    beginner: "No prior knowledge assumed. Start with fundamentals, use simple language, more remember/understand objectives",
    intermediate: "Some foundational knowledge expected. Focus on application and analysis, build on existing concepts",
    advanced: "Strong foundation assumed. Focus on evaluation, creation, and complex problem-solving",
  };
  return ctx[level] || ctx.intermediate;
}

function enrichModules(rawModules: Record<string, unknown>[]): Record<string, unknown>[] {
  return rawModules.map((mod, modIdx) => {
    const modId = `gen-mod-${modIdx + 1}`;
    const lessons = ((mod.lessons as Record<string, unknown>[]) || []).map((les, lesIdx) => {
      const lesId = `gen-les-${modIdx + 1}-${lesIdx + 1}`;
      const videos = ((les.videos as Record<string, unknown>[]) || []).map((vid, vidIdx) => ({
        ...vid,
        id: `gen-vid-${modIdx + 1}-${lesIdx + 1}-${vidIdx + 1}`,
        lesson_id: lesId,
        status: "pending",
        order: (vid.order as number) || vidIdx + 1,
      }));

      const los = ((les.learning_objectives as Record<string, unknown>[]) || []).map((lo, loIdx) => ({
        ...lo,
        id: `gen-lo-les-${modIdx + 1}-${lesIdx + 1}-${loIdx + 1}`,
      }));

      return {
        ...les,
        id: lesId,
        module_id: modId,
        order: (les.order as number) || lesIdx + 1,
        learning_objectives: los,
        videos,
      };
    });

    const modLos = ((mod.learning_objectives as Record<string, unknown>[]) || []).map((lo, loIdx) => ({
      ...lo,
      id: `gen-lo-mod-${modIdx + 1}-${loIdx + 1}`,
    }));

    return {
      ...mod,
      id: modId,
      order: (mod.order as number) || modIdx + 1,
      learning_objectives: modLos,
      lessons,
    };
  });
}

// Fallback TOC generator when OpenAI is not available
function generateFallbackTOC(params: TOCRequest): Record<string, unknown>[] {
  const { title, description, audience_level, duration_weeks, content_types } = params;
  const numModules = Math.max(3, Math.min(6, duration_weeks));

  // Extract key topics from title and description
  const words = `${title} ${description}`.toLowerCase();

  // Bloom progression per module position
  const bloomProgression: Record<number, string[]> = {
    0: ["remember", "understand"],
    1: ["understand", "apply"],
    2: ["apply", "analyze"],
    3: ["analyze", "evaluate"],
    4: ["evaluate", "create"],
    5: ["create", "evaluate"],
  };

  const modules = [];

  for (let m = 0; m < numModules; m++) {
    const blooms = bloomProgression[Math.min(m, 5)];
    const isFirst = m === 0;
    const isLast = m === numModules - 1;
    const numLessons = m === 0 ? 3 : isLast ? 3 : 3;

    const moduleTitle = getModuleTitle(m, numModules, title);
    const modId = `gen-mod-${m + 1}`;

    const lessons = [];
    for (let l = 0; l < numLessons; l++) {
      const lesId = `gen-les-${m + 1}-${l + 1}`;
      const isLastLesson = l === numLessons - 1;

      // Build content types for this lesson
      const lessonContentTypes: string[] = ["reading"];
      if (isFirst && l === 0 && content_types.includes("glossary")) {
        lessonContentTypes.push("glossary");
      }
      if ((isFirst && l === 0) || (l === 0 && content_types.includes("discussion"))) {
        if (content_types.includes("discussion")) lessonContentTypes.push("discussion");
      }
      if (content_types.includes("practice_quiz")) {
        lessonContentTypes.push("practice_quiz");
      }
      if (isLastLesson && content_types.includes("graded_quiz")) {
        lessonContentTypes.push("graded_quiz");
      }
      if (m >= 2 && l >= 1 && content_types.includes("case_study")) {
        lessonContentTypes.push("case_study");
      }
      if (content_types.includes("plugin") && l === 1) {
        lessonContentTypes.push("plugin");
      }

      const bloom = blooms[l % blooms.length];
      const lessonTitle = getLessonTitle(m, l, numModules, title);

      const numVideos = l === 0 ? 2 : 1;
      const videos = [];
      for (let v = 0; v < numVideos; v++) {
        videos.push({
          id: `gen-vid-${m + 1}-${l + 1}-${v + 1}`,
          lesson_id: lesId,
          title: `${lessonTitle} - Part ${v + 1}`,
          duration_minutes: Math.floor(Math.random() * 12) + 10,
          order: v + 1,
          status: "pending",
        });
      }

      lessons.push({
        id: lesId,
        module_id: modId,
        title: lessonTitle,
        description: `Explore the key concepts of ${lessonTitle.toLowerCase()}`,
        order: l + 1,
        learning_objectives: [
          {
            id: `gen-lo-les-${m + 1}-${l + 1}-1`,
            text: `${bloom.charAt(0).toUpperCase() + bloom.slice(1)} the core principles of ${lessonTitle.toLowerCase()}`,
            bloom_level: bloom,
          },
        ],
        content_types: lessonContentTypes,
        videos,
      });
    }

    modules.push({
      id: modId,
      course_id: "",
      title: `Module ${m + 1}: ${moduleTitle}`,
      description: `This module covers ${moduleTitle.toLowerCase()} with a focus on ${blooms.join(" and ")} level learning.`,
      order: m + 1,
      learning_objectives: blooms.map((b, i) => ({
        id: `gen-lo-mod-${m + 1}-${i + 1}`,
        text: `${b.charAt(0).toUpperCase() + b.slice(1)} the key concepts of ${moduleTitle.toLowerCase()}`,
        bloom_level: b,
      })),
      lessons,
    });
  }

  return modules;
}

function getModuleTitle(index: number, total: number, courseTitle: string): string {
  // Generic module titles based on position
  const starters = ["Foundations & Core Concepts", "Key Principles & Frameworks", "Practical Applications"];
  const middle = ["Advanced Techniques", "Real-World Implementation", "Analysis & Optimization"];
  const enders = ["Integration & Best Practices", "Capstone & Future Directions", "Review & Mastery"];

  if (index === 0) return starters[0];
  if (index === total - 1) return enders[Math.min(index, enders.length - 1)];
  if (index < total / 2) return starters[Math.min(index, starters.length - 1)];
  return middle[Math.min(index - Math.floor(total / 2), middle.length - 1)];
}

function getLessonTitle(modIndex: number, lesIndex: number, totalMods: number, courseTitle: string): string {
  const templates = [
    ["Introduction & Overview", "Core Concepts", "Hands-On Practice"],
    ["Building Blocks", "Framework Deep Dive", "Application Workshop"],
    ["Strategy & Planning", "Implementation Guide", "Case Analysis"],
    ["Advanced Patterns", "Optimization Techniques", "Performance Tuning"],
    ["Integration Strategies", "Cross-Functional Applications", "Scaling Approaches"],
    ["Capstone Project", "Industry Trends", "Next Steps & Resources"],
  ];

  const modTemplates = templates[Math.min(modIndex, templates.length - 1)];
  return modTemplates[Math.min(lesIndex, modTemplates.length - 1)];
}
