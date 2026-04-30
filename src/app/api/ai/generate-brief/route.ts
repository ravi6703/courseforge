import { NextRequest, NextResponse } from "next/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { getServerSupabase } from "@/lib/supabase/server";

interface GenerateBriefRequest {
  videoId?: string;
  lessonId?: string;
  courseId?: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  coachInput?: {
    key_topics?: string;
    examples?: string;
    visual_requirements?: string;
    difficulty_notes?: string;
    references?: string;
  };
}

interface ContentBrief {
  talking_points: string;
  visual_cues: string;
  key_takeaways: string;
  script_outline: string;
  estimated_duration: string;
  status: string;
}

function generateFallbackBrief(request: GenerateBriefRequest): ContentBrief {
  const withCoachInput = request.coachInput
    ? `\n\nCoach guidance: ${request.coachInput.key_topics || ""}`
    : "";

  return {
    talking_points: `Overview of ${request.videoTitle}
- Core concepts and definitions
- Key principles and theories
- Practical applications${withCoachInput}`,
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
    estimated_duration: "8-10 minutes",
    status: "generated",
  };
}

async function generateWithAI(
  request: GenerateBriefRequest
): Promise<ContentBrief> {
  const coachInputText = request.coachInput
    ? `\nCoach-provided input:
    - Key Topics: ${request.coachInput.key_topics || "N/A"}
    - Examples: ${request.coachInput.examples || "N/A"}
    - Visual Requirements: ${request.coachInput.visual_requirements || "N/A"}
    - Difficulty Notes: ${request.coachInput.difficulty_notes || "N/A"}
    - References: ${request.coachInput.references || "N/A"}`
    : "";

  const prompt = `You are an expert instructional designer. Generate a comprehensive content brief for a video lesson.

Course: ${request.courseTitle}
Module: ${request.moduleTitle}
Lesson: ${request.lessonTitle}
Video Title: ${request.videoTitle}${coachInputText}

Create a detailed brief in JSON format with these fields:
{
  "talking_points": "Main topics and key points to cover (bullet points or numbered list)",
  "visual_cues": "Visual aids and design elements needed (bullet points)",
  "key_takeaways": "Learning outcomes and key takeaways (bullet points)",
  "script_outline": "Time-coded script outline with sections",
  "estimated_duration": "Estimated video length",
  "status": "generated"
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
        model: "claude-sonnet-4-6",
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

    const brief = JSON.parse(jsonMatch[0]) as ContentBrief;
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

    // Persist to Supabase if courseId + lessonId provided
    if (body.courseId && body.lessonId) {
      const supabase = await getServerSupabase();
      const toArr = (s: string) => s.split("\n").filter((l) => l.trim());
      await supabase.from("content_briefs").insert({
        lesson_id: body.lessonId,
        course_id: body.courseId,
        talking_points: toArr(brief.talking_points),
        visual_cues: toArr(brief.visual_cues),
        key_takeaways: toArr(brief.key_takeaways),
        script_outline: brief.script_outline,
        status: "generated",
      });
    }

    return NextResponse.json({ success: true, brief }, { headers: aiHeaders(aiMode()) });
  } catch (error) {
    console.error("Error in /api/ai/generate-brief:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate brief" },
      { status: 500, headers: aiHeaders(aiMode()) }
    );
  }
}
