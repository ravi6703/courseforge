import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface TOCRequest {
  title: string;
  description: string;
  platform: string;
  audience_level: string;
  duration_weeks: number;
  content_types: string[];
  video_length?: string;
  theory_ratio?: string;
}

interface ContentItem {
  type: "video" | "reading" | "practice_quiz" | "graded_quiz" | "discussion" | "assignment" | "ungraded_lab" | "ungraded_plugin" | "glossary" | "case_study" | "ai_dialogue";
  title: string;
  duration: string;
  order: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: TOCRequest = await req.json();

    // If no Anthropic key, use built-in generation
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your-anthropic-key") {
      const toc = generateFallbackTOC(body);
      return NextResponse.json({ success: true, modules: toc });
    }

    // Call Anthropic Claude API
    const numModules = Math.max(3, Math.min(6, body.duration_weeks));
    const systemPrompt = `You are CourseForge AI — an expert instructional designer for Board Infinity / InfyLearn. You create Bloom's Taxonomy-aligned course TOCs that match Board Infinity's EXACT format.

BOARD INFINITY TOC FORMAT (follow this EXACTLY):

1. MODULE FORMAT:
   - Title: "Module [#] - [Title]" (use dash, not colon)
   - Duration: total hours & minutes (e.g. "5 hrs 40 min")
   - Module Description: 1 paragraph describing what students learn in this module
   - Learning Objectives: 3-4 bullet points using Bloom's action verbs
   - 3-5 Lessons per module

2. LESSON FORMAT:
   - Title: "Lesson [M.L] - [Title]" (e.g. "Lesson 1.1 - Introduction to the Course")
   - Contains ordered content items (videos, readings, quizzes, etc.)

3. CONTENT ITEM FORMAT (each item has type, title, duration):
   - Video: "Video [#]: [Descriptive Title] ([X] min [Y] sec)" — e.g. "Video 1: What is Java? (4 min 25 sec)"
   - Reading: "Reading: [Title] ([X] min)" — e.g. "Reading: Read More on Java (30 min)"
   - Practice Quiz: "Practice assignment: [Topic] - Practice Quiz (30 min)"
   - Graded Quiz: "Assignment: [Module Title] - Graded Quiz (1 hr)" — ONLY in last lesson of each module
   - Discussion Prompt: "Discussion Prompt: [Question] (10 min)" — Module 1 Lesson 1 and first lesson of each module
   - Ungraded Lab: "Ungraded Lab: Lab : [Title] (1 hr)"
   - Lab Solution Reading: "Reading: Lab Solution : [Title] (10 min)" — always follows an Ungraded Lab
   - Ungraded Plugin: "Ungraded Plugin: Quick Course Check-In (15 min)" — optional end of module
   - Glossary: appears only in Module 1 Lesson 1
   - Case Study: "Case Study: [Scenario Title] (45 min)" — Module 2+ applied scenarios
   - AI Dialogue: "AI Dialogue: [Title] (20 min)" — interactive dialogues in intermediate lessons

4. CONTENT ITEM RULES:
   - Each lesson has 3-8 videos with specific descriptive titles
   - Video durations: realistic, between 1 min and 15 min each
   - Target video length per lesson: ${body.video_length || "10-15 min"} per video
   - Theory to hands-on ratio: ${body.theory_ratio || "70:30"}
   - Every lesson has at least 1 Reading (15-30 min)
   - Practice Quiz at end of most lessons (30 min)
   - Graded Quiz ONLY in the last lesson of each module (1 hr)
   - First video of each lesson: "Video 1: What you will learn in this Lesson (1 min)"
   - Discussion Prompts in first lesson of every module
   - Ungraded Labs in last lesson of modules (for hands-on courses)
   - Reading for Syllabus in Module 1 Lesson 1

5. BLOOM'S TAXONOMY PROGRESSION:
   - bloom_level per learning objective: remember, understand, apply, analyze, evaluate, create
   - Early modules → remember, understand
   - Middle modules → apply, analyze
   - Later modules → evaluate, create

6. STRUCTURE:
   - Generate ${numModules} modules total
   - Module 1 Lesson 1 is always "Introduction to the Course" with syllabus, meet instructor, glossary
   - Final module has a capstone or synthesis component
   - Platform "${body.platform}": ${getPlatformContext(body.platform)}
   - Audience "${body.audience_level}": ${getAudienceContext(body.audience_level)}

Respond with valid JSON only. No markdown, no explanation.`;

    const userPrompt = `Create a detailed TOC for:
Title: ${body.title}
Description: ${body.description}
Platform: ${body.platform}
Audience: ${body.audience_level}
Duration: ${body.duration_weeks} weeks
Content Types: ${body.content_types.join(", ")}

Return JSON array of modules with this EXACT structure:
[
  {
    "title": "Module 1 - Introduction to [Topic]",
    "description": "In this module, you will...",
    "duration": "5 hrs 40 min",
    "order": 1,
    "learning_objectives": [
      { "text": "Understand the core principles of...", "bloom_level": "understand" }
    ],
    "lessons": [
      {
        "title": "Lesson 1.1 - Introduction to the Course",
        "description": "Get started with the course...",
        "order": 1,
        "content_items": [
          { "type": "video", "title": "Video 1: Introduction to the Specialization (1 min 39 sec)", "duration": "1 min 39 sec", "order": 1 },
          { "type": "video", "title": "Video 2: Introduction to the Course (2 min 1 sec)", "duration": "2 min 1 sec", "order": 2 },
          { "type": "video", "title": "Video 3: Meet Your Instructor (1 min 5 sec)", "duration": "1 min 5 sec", "order": 3 },
          { "type": "reading", "title": "Reading: Syllabus (15 min)", "duration": "15 min", "order": 4 },
          { "type": "discussion", "title": "Discussion Prompt: What Interests You About [Topic]? (10 min)", "duration": "10 min", "order": 5 }
        ]
      }
    ]
  }
]

IMPORTANT: Every lesson must have a "content_items" array with SPECIFIC video titles, readings, quizzes etc. matching Board Infinity format. Videos must have realistic descriptive titles, not generic ones.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      const toc = generateFallbackTOC(body);
      return NextResponse.json({ success: true, modules: toc, fallback: true });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      const toc = generateFallbackTOC(body);
      return NextResponse.json({ success: true, modules: toc, fallback: true });
    }

    let parsed = JSON.parse(content);
    if (parsed.modules && Array.isArray(parsed.modules)) {
      parsed = parsed.modules;
    }

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

      // Enrich content_items
      const rawItems = (les.content_items as Record<string, unknown>[]) || [];
      const contentItems = rawItems.map((item, itemIdx) => ({
        type: (item.type as string) || "reading",
        title: (item.title as string) || "",
        duration: (item.duration as string) || "",
        id: `gen-ci-${modIdx + 1}-${lesIdx + 1}-${itemIdx + 1}`,
        order: (item.order as number) || itemIdx + 1,
      }));

      // Extract videos from content_items for backward compatibility
      const videos = contentItems
        .filter((item) => item.type === "video")
        .map((vid, vidIdx) => ({
          id: `gen-vid-${modIdx + 1}-${lesIdx + 1}-${vidIdx + 1}`,
          lesson_id: lesId,
          title: vid.title || `Video ${vidIdx + 1}`,
          duration: vid.duration || "5 min",
          duration_minutes: parseDurationToMinutes(vid.duration || "5 min"),
          order: vidIdx + 1,
          status: "pending",
        }));

      // Build content_types array from content_items for backward compat
      const contentTypes = [...new Set(contentItems.map((item) => item.type))];

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
        content_items: contentItems,
        content_types: contentTypes,
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

function parseDurationToMinutes(duration: string): number {
  const hrMatch = duration.match(/(\d+)\s*hr/);
  const minMatch = duration.match(/(\d+)\s*min/);
  const secMatch = duration.match(/(\d+)\s*sec/);
  let total = 0;
  if (hrMatch) total += parseInt(hrMatch[1]) * 60;
  if (minMatch) total += parseInt(minMatch[1]);
  if (secMatch) total += parseInt(secMatch[1]) / 60;
  return Math.round(total) || 5;
}

// ─── Fallback TOC Generator (Board Infinity Detailed Format) ─────────────────

function generateFallbackTOC(params: TOCRequest): Record<string, unknown>[] {
  const { title, description, audience_level, duration_weeks, content_types } = params;
  const numModules = Math.max(3, Math.min(6, duration_weeks));
  const videoLengthRange = parseVideoLength(params.video_length || "10-15 min");

  // Extract topic keywords for realistic titles
  const topic = extractTopic(title);

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

    const moduleTitle = getModuleTitle(m, numModules, title, topic);
    const modId = `gen-mod-${m + 1}`;
    const numLessons = isFirst ? 3 : isLast ? 4 : 4;

    // Calculate module duration from lessons
    let totalModuleMinutes = 0;
    const lessons = [];

    for (let l = 0; l < numLessons; l++) {
      const lesId = `gen-les-${m + 1}-${l + 1}`;
      const isFirstLesson = l === 0;
      const isLastLesson = l === numLessons - 1;

      const lessonTitle = getLessonTitle(m, l, numModules, title, topic);
      const lessonSubtopic = getLessonSubtopic(m, l, title, topic);
      const contentItems: ContentItem[] = [];
      let itemOrder = 1;
      let lessonMinutes = 0;

      // ── First lesson of Module 1: Introduction pattern ──
      if (isFirst && isFirstLesson) {
        contentItems.push(
          { type: "video", title: `Video 1: Introduction to the Specialization (1 min 39 sec)`, duration: "1 min 39 sec", order: itemOrder++ },
          { type: "video", title: `Video 2: Introduction to the Course (2 min 1 sec)`, duration: "2 min 1 sec", order: itemOrder++ },
          { type: "video", title: `Video 3: Meet Your Instructor (1 min 5 sec)`, duration: "1 min 5 sec", order: itemOrder++ },
          { type: "reading", title: `Reading: Syllabus (15 min)`, duration: "15 min", order: itemOrder++ },
        );
        if (content_types.includes("discussion")) {
          contentItems.push({ type: "discussion", title: `Discussion Prompt: Starting ${topic}: What Might Trip You Up? (10 min)`, duration: "10 min", order: itemOrder++ });
        }
        if (content_types.includes("glossary")) {
          contentItems.push({ type: "glossary", title: `Glossary: Key Terms in ${topic} (15 min)`, duration: "15 min", order: itemOrder++ });
        }
        lessonMinutes = 30;
      }
      // ── First lesson of other modules: has discussion prompt ──
      else if (isFirstLesson) {
        const numVideos = randomInt(3, 5);
        for (let v = 0; v < numVideos; v++) {
          const vidTitle = getVideoTitle(v, lessonSubtopic, m, l);
          const vidDur = randomVideoDuration(videoLengthRange);
          contentItems.push({ type: "video", title: `Video ${v + 1}: ${vidTitle} (${vidDur})`, duration: vidDur, order: itemOrder++ });
        }
        contentItems.push({ type: "reading", title: `Reading: Read More About ${lessonSubtopic} (30 min)`, duration: "30 min", order: itemOrder++ });
        if (content_types.includes("discussion")) {
          contentItems.push({ type: "discussion", title: `Discussion Prompt: How Are You Feeling About ${lessonSubtopic}? (10 min)`, duration: "10 min", order: itemOrder++ });
        }
        if (content_types.includes("practice_quiz")) {
          contentItems.push({ type: "practice_quiz", title: `Practice assignment: ${lessonSubtopic} - Practice Quiz (30 min)`, duration: "30 min", order: itemOrder++ });
        }
        lessonMinutes = numVideos * avgMinutes(videoLengthRange) + 70;
      }
      // ── Last lesson of module: has graded quiz, lab ──
      else if (isLastLesson) {
        const numVideos = randomInt(3, 5);
        for (let v = 0; v < numVideos; v++) {
          const vidTitle = getVideoTitle(v, lessonSubtopic, m, l);
          const vidDur = randomVideoDuration(videoLengthRange);
          contentItems.push({ type: "video", title: `Video ${v + 1}: ${vidTitle} (${vidDur})`, duration: vidDur, order: itemOrder++ });
        }
        contentItems.push({ type: "reading", title: `Reading: Learn More About ${lessonSubtopic} (30 min)`, duration: "30 min", order: itemOrder++ });
        if (content_types.includes("practice_quiz")) {
          contentItems.push({ type: "practice_quiz", title: `Practice assignment: ${lessonSubtopic} - Practice Quiz (30 min)`, duration: "30 min", order: itemOrder++ });
        }
        if (content_types.includes("graded_quiz")) {
          contentItems.push({ type: "graded_quiz", title: `Assignment: ${moduleTitle} - Graded Quiz (1 hr)`, duration: "1 hr", order: itemOrder++ });
        }
        // Ungraded Lab for hands-on modules
        if (m >= 1) {
          contentItems.push({ type: "ungraded_lab", title: `Ungraded Lab: Lab : ${lessonSubtopic} in Practice (1 hr)`, duration: "1 hr", order: itemOrder++ });
          contentItems.push({ type: "reading", title: `Reading: Lab Solution : ${lessonSubtopic} in Practice (10 min)`, duration: "10 min", order: itemOrder++ });
        }
        if (content_types.includes("plugin")) {
          contentItems.push({ type: "ungraded_plugin", title: `Ungraded Plugin: Quick Course Check-In (15 min)`, duration: "15 min", order: itemOrder++ });
        }
        // Feedback reading in last module
        if (isLast) {
          contentItems.push({ type: "reading", title: `Reading: Learner Success Stories (5 min)`, duration: "5 min", order: itemOrder++ });
          contentItems.push({ type: "reading", title: `Reading: Provide your feedback! (10 min)`, duration: "10 min", order: itemOrder++ });
        }
        lessonMinutes = numVideos * avgMinutes(videoLengthRange) + 130;
      }
      // ── Regular lesson ──
      else {
        const numVideos = randomInt(4, 7);
        for (let v = 0; v < numVideos; v++) {
          const vidTitle = getVideoTitle(v, lessonSubtopic, m, l);
          const vidDur = randomVideoDuration(videoLengthRange);
          contentItems.push({ type: "video", title: `Video ${v + 1}: ${vidTitle} (${vidDur})`, duration: vidDur, order: itemOrder++ });
        }
        contentItems.push({ type: "reading", title: `Reading: Read More About ${lessonSubtopic} (30 min)`, duration: "30 min", order: itemOrder++ });
        if (content_types.includes("practice_quiz")) {
          contentItems.push({ type: "practice_quiz", title: `Practice assignment: ${lessonSubtopic} - Practice Quiz (30 min)`, duration: "30 min", order: itemOrder++ });
        }
        // Case studies in module 2+
        if (m >= 2 && l >= 1 && content_types.includes("case_study")) {
          contentItems.push({ type: "case_study", title: `Case Study: Applying ${lessonSubtopic} in a Real Scenario (45 min)`, duration: "45 min", order: itemOrder++ });
        }
        // AI dialogue in intermediate lessons
        if (m >= 1 && l >= 1 && content_types.includes("ai_dialogue")) {
          contentItems.push({ type: "ai_dialogue", title: `AI Dialogue: Explore ${lessonSubtopic} Interactively (20 min)`, duration: "20 min", order: itemOrder++ });
        }
        lessonMinutes = numVideos * avgMinutes(videoLengthRange) + 60;
      }

      totalModuleMinutes += lessonMinutes;

      // Extract videos for backward compat
      const videos = contentItems
        .filter((ci) => ci.type === "video")
        .map((vid, vidIdx) => ({
          id: `gen-vid-${m + 1}-${l + 1}-${vidIdx + 1}`,
          lesson_id: lesId,
          title: vid.title,
          duration: vid.duration,
          duration_minutes: parseDurationToMinutes(vid.duration),
          order: vidIdx + 1,
          status: "pending",
        }));

      const contentTypeSet = [...new Set(contentItems.map((ci) => ci.type))];
      const bloom = blooms[l % blooms.length];

      lessons.push({
        id: lesId,
        module_id: modId,
        title: `Lesson ${m + 1}.${l + 1} - ${lessonTitle}`,
        description: `Explore the key concepts of ${lessonTitle.toLowerCase()}`,
        order: l + 1,
        learning_objectives: [
          {
            id: `gen-lo-les-${m + 1}-${l + 1}-1`,
            text: `${getBloomVerb(bloom)} the core principles of ${lessonSubtopic.toLowerCase()}`,
            bloom_level: bloom,
          },
        ],
        content_items: contentItems.map((ci, ciIdx) => ({
          ...ci,
          id: `gen-ci-${m + 1}-${l + 1}-${ciIdx + 1}`,
        })),
        content_types: contentTypeSet,
        videos,
      });
    }

    const durationStr = formatDuration(totalModuleMinutes);

    modules.push({
      id: modId,
      course_id: "",
      title: `Module ${m + 1} - ${moduleTitle}`,
      description: getModuleDescription(m, numModules, moduleTitle, topic),
      duration: durationStr,
      order: m + 1,
      learning_objectives: blooms.map((b, i) => ({
        id: `gen-lo-mod-${m + 1}-${i + 1}`,
        text: `${getBloomVerb(b)} the key concepts of ${moduleTitle.toLowerCase()}`,
        bloom_level: b,
      })),
      lessons,
    });
  }

  return modules;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function extractTopic(title: string): string {
  // Remove common prefixes
  return title
    .replace(/^(mastering|introduction to|fundamentals of|advanced|building|learn)\s+/i, "")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
}

function parseVideoLength(vl: string): [number, number] {
  const match = vl.match(/(\d+)-(\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2])];
  return [10, 15];
}

function avgMinutes(range: [number, number]): number {
  return Math.round((range[0] + range[1]) / 2);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomVideoDuration(range: [number, number]): string {
  const min = Math.max(1, range[0] - 3);
  const max = range[1] + 2;
  const totalSec = randomInt(min * 60, max * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
}

function formatDuration(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hrs`;
  return `${hrs} hrs ${mins} min`;
}

function getBloomVerb(level: string): string {
  const verbs: Record<string, string> = {
    remember: "Identify",
    understand: "Explain",
    apply: "Apply",
    analyze: "Analyze",
    evaluate: "Evaluate",
    create: "Design",
  };
  return verbs[level] || "Understand";
}

function getModuleTitle(index: number, total: number, courseTitle: string, topic: string): string {
  if (index === 0) return `${topic} Fundamentals`;
  if (index === 1) return `Core ${topic} Concepts`;
  if (index === total - 1) return `Advanced ${topic} and Capstone Project`;
  if (index === total - 2) return `${topic} in Practice`;

  const midTitles = [
    `Working with ${topic} Tools`,
    `${topic} Patterns and Techniques`,
    `Building with ${topic}`,
    `${topic} Architecture and Design`,
  ];
  return midTitles[Math.min(index - 2, midTitles.length - 1)];
}

function getModuleDescription(index: number, total: number, moduleTitle: string, topic: string): string {
  if (index === 0) {
    return `In the ${moduleTitle} module, you will be introduced to ${topic} and its integral components. This module provides an understanding of basic concepts and a hands-on experience with essential tools and techniques. By the end of this module, you will have a solid foundation to build upon in subsequent modules.`;
  }
  if (index === total - 1) {
    return `This final module brings together everything you have learned about ${topic}. You will work on advanced concepts, tackle real-world scenarios, and complete a capstone project that demonstrates your mastery. By the end of this module, you will be able to apply your knowledge to develop efficient and scalable solutions.`;
  }
  return `This module covers ${moduleTitle.toLowerCase()} in depth. You will learn about essential concepts, work through practical exercises, and build your skills through hands-on assessments. Throughout the module, several projects will reinforce your learning and improve your problem-solving abilities.`;
}

function getLessonTitle(modIndex: number, lesIndex: number, totalMods: number, courseTitle: string, topic: string): string {
  // Module 1 templates
  const m1 = ["Introduction to the Course", `Overview of ${topic}`, `Components of ${topic}`, `${topic} Development Environment`];
  // Module 2 templates
  const m2 = [`${topic} Variables and Data Types`, `Operators and Expressions`, `Working with Collections`, `Control Flow and Logic`];
  // Generic middle module templates
  const mid = [
    [`Core Concepts`, `Implementation Patterns`, `Hands-On Workshop`, `Best Practices`],
    [`Architecture Overview`, `Design Patterns`, `Performance Optimization`, `Testing Strategies`],
    [`Integration Techniques`, `Real-World Applications`, `Debugging and Troubleshooting`, `Code Review`],
  ];
  // Last module templates
  const last = [`Advanced Techniques`, `Real-World Project`, `Capstone Project`, `Next Steps and Resources`];

  if (modIndex === 0) return m1[Math.min(lesIndex, m1.length - 1)];
  if (modIndex === 1) return m2[Math.min(lesIndex, m2.length - 1)];
  if (modIndex === totalMods - 1) return last[Math.min(lesIndex, last.length - 1)];

  const midSet = mid[Math.min(modIndex - 2, mid.length - 1)];
  return midSet[Math.min(lesIndex, midSet.length - 1)];
}

function getLessonSubtopic(modIndex: number, lesIndex: number, courseTitle: string, topic: string): string {
  const titles = [
    [`${topic} Basics`, `${topic} Overview`, `${topic} Components`, `${topic} Setup`],
    [`Variables and Types`, `Operators`, `Collections and Arrays`, `Control Statements`],
    [`Core Concepts`, `Implementation`, `Workshop`, `Best Practices`],
    [`Architecture`, `Design Patterns`, `Optimization`, `Testing`],
    [`Integration`, `Applications`, `Debugging`, `Code Review`],
    [`Advanced Techniques`, `Real-World Project`, `Capstone`, `Next Steps`],
  ];
  const row = Math.min(modIndex, titles.length - 1);
  const col = Math.min(lesIndex, titles[row].length - 1);
  return titles[row][col];
}

function getVideoTitle(videoIndex: number, subtopic: string, modIndex: number, lesIndex: number): string {
  if (videoIndex === 0) return `What you will learn in this Lesson`;

  const patterns = [
    `What is ${subtopic}?`,
    `Key Features of ${subtopic}`,
    `${subtopic} in Action`,
    `Demo: Working with ${subtopic}`,
    `Hands-On: ${subtopic} Exercise`,
    `Deep Dive into ${subtopic}`,
    `Common Patterns in ${subtopic}`,
    `${subtopic} Best Practices`,
    `Troubleshooting ${subtopic}`,
    `Advanced ${subtopic} Techniques`,
  ];

  return patterns[Math.min(videoIndex - 1, patterns.length - 1)];
}
