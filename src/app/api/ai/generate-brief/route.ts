import { NextRequest, NextResponse } from "next/server";
import { CoachInput } from "@/types";

interface GenerateBriefRequest {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  coachInput?: CoachInput;
}

interface ContentBriefResponse {
  what_to_cover: string;
  examples: string;
  visual_cues: string;
  key_takeaways: string;
  script_outline: string;
}

function generateFallbackBrief(request: GenerateBriefRequest): ContentBriefResponse {
  const topic = `${request.moduleTitle} - ${request.lessonTitle}`;
  const withCoachInput = request.coachInput ? `\n\nCoach guidance: ${request.coachInput.key_topics}` : "";

  return {
    what_to_cover: `Overview of ${request.videoTitle}
- Core concepts and definitions
- Key principles and theories
- Practical applications${withCoachInput}`,
    examples: `1. Real-world example showing practical implementation
2. Step-by-step walkthrough of common use case
3. Edge case handling and best practices
4. Integration with related concepts`,
    visual_cues: `- Animated diagrams showing concept flow
- Code snippets with syntax highlighting
- Before/after comparison visuals
- Interactive whiteboard demonstrations
- Key terms highlighted in bold`,
    key_takeaways: `By the end of this video, learners will:
- Understand the core concepts of ${request.lessonTitle}
- Apply learned principles to practical scenarios
- Identify common mistakes and how to avoid them
- Connect this lesson to broader ${request.moduleTitle} concepts`,
    script_outline: `[0:00-0:30] Introduction & Learning Goals
[0:30-3:00] Core Concept Explanation
[3:00-5:00] First Example & Walkthrough
[5:00-7:00] Second Example & Application
[7:00-8:00] Common Mistakes & Best Practices
[8:00-8:30] Summary & Next Steps`,
  };
}

async function generateWithAI(request: GenerateBriefRequest): Promise<ContentBriefResponse> {
  const coachInputText = request.coachInput
    ? `\nCoach-provided input:
    - Key Topics: ${request.coachInput.key_topics}
    - Examples: ${request.coachInput.examples}
    - Visual Requirements: ${request.coachInput.visual_requirements}
    - Difficulty Notes: ${request.coachInput.difficulty_notes}
    - References: ${request.coachInput.references}`
    : "";

  const prompt = `You are an expert instructional designer. Generate a comprehensive content brief for a video lesson.

Video Details:
- Title: ${request.videoTitle}
- Module: ${request.moduleTitle}
- Lesson: ${request.lessonTitle}${coachInputText}

Create a detailed brief with 5 sections in JSON format:
{
  "what_to_cover": "Main topics and key points (include subtopics)",
  "examples": "Specific examples to demonstrate concepts (numbered list)",
  "visual_cues": "Visual aids and design elements needed (bullet points)",
  "key_takeaways": "Learning outcomes and key takeaways (bullet points)",
  "script_outline": "Time-coded script outline with sections"
}

The brief should be:
- Practical and implementation-focused
- Aligned with learner outcomes
- Include 3-4 concrete examples
- Specify visual requirements clearly
- Provide a realistic timing breakdown`;

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
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return generateFallbackBrief(request);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackBrief(request);
    }

    const brief = JSON.parse(jsonMatch[0]) as ContentBriefResponse;
    return brief;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackBrief(request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateBriefRequest;

    const brief = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackBrief(body);

    return NextResponse.json({ brief });
  } catch (error) {
    console.error("Error in /api/ai/generate-brief:", error);
    return NextResponse.json(
      { error: "Failed to generate brief" },
      { status: 500 }
    );
  }
}
