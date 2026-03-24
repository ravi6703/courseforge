import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/content-items/[id]/generate
 *
 * AI Content Generation Engine — the core of CourseForge.
 * Generates full content for a TOC item based on its type.
 *
 * Supported content types:
 * - reading: Long-form article (1000-3000 words)
 * - video: Video script with slide cues and timing
 * - practice_quiz: MCQ quiz with distractors
 * - graded_quiz: Graded assessment with rubric
 * - discussion_prompt: Bloom's-aligned discussion starter
 * - case_study: Industry-relevant scenario
 * - glossary: Key terms and definitions
 * - coding_exercise: Starter code + test cases
 * - ai_dialogue: Interactive dialogue (Coursera-only)
 * - role_play: Scenario-based role play (Coursera-only)
 *
 * Request body:
 * {
 *   type: string        — content type (see above)
 *   title?: string       — item title for context
 *   topic?: string       — topic/subject area
 *   learningObjectives?: string[] — what the learner should achieve
 *   difficulty?: string  — beginner | intermediate | advanced
 *   platform?: string    — coursera | udemy | university
 *   additionalContext?: string — any extra instructions
 * }
 *
 * Response:
 * {
 *   content: string      — the generated content (markdown)
 *   metadata: object     — type-specific metadata
 *   wordCount: number
 *   estimatedDuration: number — minutes
 * }
 */

interface GenerateRequest {
  type: string;
  title?: string;
  topic?: string;
  learningObjectives?: string[];
  difficulty?: string;
  platform?: string;
  additionalContext?: string;
}

interface GenerateResponse {
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
  wordCount: number;
  estimatedDuration: number;
}

// ─── CONTENT GENERATION PROMPTS (fill in your own) ───────────────────────

const GENERATION_PROMPTS: Record<string, string> = {
  reading: `
    You are an expert course content writer. Generate a comprehensive reading
    article for an online course. The reading should:
    - Be 1000-3000 words
    - Include clear headings and subheadings (markdown format)
    - Start with a brief introduction and end with a summary
    - Include real-world examples
    - Use clear, accessible language appropriate for the difficulty level
    - Tie back to the provided learning objectives

    TODO: Customize this prompt with your domain-specific instructions.
  `,

  video: `
    You are a video script writer for online courses. Generate a detailed
    video script that includes:
    - Timestamps and slide cues (e.g., [SLIDE 1: Title], [00:30])
    - Speaker notes and narration text
    - Visual descriptions for each slide
    - An engaging opening hook
    - A clear summary/recap at the end
    - Target duration based on the item's allocated time

    TODO: Customize this prompt with your presentation style guide.
  `,

  practice_quiz: `
    You are an assessment designer. Generate a practice quiz with:
    - 5-10 multiple choice questions
    - 4 options per question (A, B, C, D)
    - One correct answer per question
    - Plausible distractors that test common misconceptions
    - Brief explanation for each correct answer
    - Questions aligned to Bloom's Taxonomy levels

    TODO: Customize with your quiz format and difficulty calibration.
  `,

  graded_quiz: `
    You are an assessment designer. Generate a graded assessment with:
    - 10-15 questions mixing MCQ, true/false, and short answer
    - A clear rubric with point values
    - Model answers for each question
    - Questions that test higher-order thinking (Bloom's: Apply, Analyze, Evaluate)
    - Total points summing to 100

    TODO: Customize with your grading standards.
  `,

  discussion_prompt: `
    Generate a thought-provoking discussion prompt that:
    - Encourages critical thinking and peer interaction
    - Connects theory to real-world application
    - Includes 2-3 guiding sub-questions
    - Suggests a response length (150-300 words)

    TODO: Add your discussion rubric template.
  `,

  case_study: `
    Generate a realistic case study that:
    - Presents a real-world scenario relevant to the topic
    - Includes background context, data/evidence, and key stakeholders
    - Poses 3-5 analysis questions
    - Has no single "right" answer — encourages debate

    TODO: Customize with industry-specific scenarios.
  `,

  glossary: `
    Generate a glossary of 15-25 key terms for this topic. Each entry should include:
    - The term
    - A clear, concise definition (1-2 sentences)
    - An example of usage in context

    TODO: Add domain-specific terminology requirements.
  `,

  coding_exercise: `
    Generate a coding exercise that includes:
    - Problem statement with clear requirements
    - Starter code template
    - 3-5 test cases (input/expected output)
    - Hints (progressive, from subtle to explicit)
    - A model solution

    TODO: Specify programming language and framework.
  `,

  ai_dialogue: `
    Generate an interactive AI dialogue scenario (Coursera format) with:
    - A realistic conversation between learner and AI tutor
    - Branch points where the learner chooses responses
    - Feedback for each choice (correct path and misconception paths)
    - 4-6 exchange rounds

    TODO: Customize with Coursera's AI dialogue format spec.
  `,

  role_play: `
    Generate a role-play scenario with:
    - Character descriptions and motivations
    - Situation setup and context
    - Key decision points
    - Debrief questions for reflection

    TODO: Customize with your role-play assessment criteria.
  `,
};

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as GenerateRequest;

    if (!body.type) {
      return NextResponse.json(
        { error: "Missing required field: type" },
        { status: 400 }
      );
    }

    const prompt = GENERATION_PROMPTS[body.type];
    if (!prompt) {
      return NextResponse.json(
        { error: `Unsupported content type: ${body.type}` },
        { status: 400 }
      );
    }

    // ── Check for API key ──────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // No API key — return a placeholder so the UI still works
      return NextResponse.json({
        content: getPlaceholderContent(body.type, body.title || "Untitled"),
        metadata: { generated: false, reason: "ANTHROPIC_API_KEY not configured" },
        wordCount: 0,
        estimatedDuration: 0,
      });
    }

    // ── Build the full prompt ──────────────────────────────────────────
    const fullPrompt = buildFullPrompt(prompt, body);

    // ── Call Claude API ────────────────────────────────────────────────
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Claude API error:", errorData);
      return NextResponse.json(
        { error: "AI generation failed", details: errorData },
        { status: 502 }
      );
    }

    const result = await response.json();
    const generatedContent =
      result.content?.[0]?.type === "text"
        ? result.content[0].text
        : "";

    const wordCount = generatedContent.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = Math.ceil(wordCount / 200); // ~200 wpm reading speed

    const generateResponse: GenerateResponse = {
      content: generatedContent,
      metadata: {
        generated: true,
        contentItemId: id,
        contentType: body.type,
        model: "claude-sonnet-4-20250514",
        wordCount,
      },
      wordCount,
      estimatedDuration,
    };

    return NextResponse.json(generateResponse);
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function buildFullPrompt(systemPrompt: string, body: GenerateRequest): string {
  const parts = [systemPrompt.trim()];

  if (body.title) parts.push(`Topic/Title: ${body.title}`);
  if (body.topic) parts.push(`Subject Area: ${body.topic}`);
  if (body.difficulty) parts.push(`Difficulty Level: ${body.difficulty}`);
  if (body.platform) parts.push(`Target Platform: ${body.platform}`);

  if (body.learningObjectives && body.learningObjectives.length > 0) {
    parts.push(
      `Learning Objectives:\n${body.learningObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`
    );
  }

  if (body.additionalContext) {
    parts.push(`Additional Instructions: ${body.additionalContext}`);
  }

  parts.push("Generate the content now in markdown format.");

  return parts.join("\n\n");
}

function getPlaceholderContent(type: string, title: string): string {
  return `# ${title}

> **This is placeholder content.** To enable AI generation, add your \`ANTHROPIC_API_KEY\` to \`.env.local\`.

## Content Type: ${type}

This ${type} will be AI-generated once the API key is configured. The generation engine supports:

- **Readings**: 1000-3000 word articles with headings, examples, and summaries
- **Video Scripts**: Timestamped scripts with slide cues and speaker notes
- **Quizzes**: MCQ with distractors, explanations, and Bloom's alignment
- **Assessments**: Graded evaluations with rubrics and model answers
- **Discussion Prompts**: Critical thinking questions with sub-prompts
- **Case Studies**: Real-world scenarios with analysis questions
- **Glossaries**: Key terms with definitions and usage examples
- **Coding Exercises**: Problems with starter code, tests, and solutions

---

*Configure \`ANTHROPIC_API_KEY\` in your environment to activate AI content generation.*
`;
}
