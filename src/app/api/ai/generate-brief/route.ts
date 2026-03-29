import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface GenerateBriefRequest {
  videoTitle: string;
  lessonTitle: string;
  moduleName: string;
  duration: number;
  courseName: string;
}

interface ContentBrief {
  talking_points: string[];
  visual_cues: string[];
  examples: string[];
  key_takeaways: string[];
  script_outline: string;
}

function generateFallbackBrief(req: GenerateBriefRequest): ContentBrief {
  return {
    talking_points: [
      `Introduction to ${req.videoTitle}`,
      `Key concepts and framework overview`,
      `Practical applications and real-world examples`,
      `Common challenges and how to overcome them`,
      `Summary and next steps`,
    ],
    visual_cues: [
      `Title slide with ${req.moduleName} branding`,
      `Concept diagram showing relationships`,
      `Screenshot or demo of practical application`,
      `Key statistics or data visualization`,
      `Call-to-action or wrap-up graphic`,
    ],
    examples: [
      `Real-world case study from ${req.courseName}`,
      `Step-by-step walkthrough example`,
      `Before/after comparison`,
      `Common mistake and correction`,
    ],
    key_takeaways: [
      `Main concept: Core idea of ${req.videoTitle}`,
      `Practical application in ${req.courseName}`,
      `How to implement immediately`,
      `Common pitfalls to avoid`,
    ],
    script_outline: `Introduction (0:00-0:30)
- Hook the viewer with ${req.lessonTitle}
- Preview what they'll learn

Body (0:30-${req.duration - 1}:00)
- Explain main concept
- Provide real-world examples
- Show practical application
- Address common questions

Conclusion (${req.duration - 1}:00-${req.duration}:00)
- Recap key takeaways
- Call to action for next lesson`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateBriefRequest = await req.json();

    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your-anthropic-key") {
      // Fallback: return realistic brief data
      return NextResponse.json({
        success: true,
        brief: generateFallbackBrief(body),
      });
    }

    const systemPrompt = `You are CourseForge AI — an expert instructional designer specializing in video content creation. Your task is to generate comprehensive content briefs for video lessons.

When generating briefs:
1. Create engaging, specific talking points tailored to the lesson
2. Suggest visual elements that enhance understanding
3. Provide concrete, relevant examples
4. Identify key concepts students must grasp
5. Outline a clear script structure with timing
6. Return valid JSON only

The brief should help content creators produce engaging, effective video content aligned with course objectives.`;

    const userPrompt = `Generate a detailed content brief for this video:

Course: ${body.courseName}
Module: ${body.moduleName}
Lesson: ${body.lessonTitle}
Video Title: ${body.videoTitle}
Duration: ${body.duration} minutes

Create a JSON response with the following structure:
{
  "talking_points": [array of 5-7 main discussion points],
  "visual_cues": [array of 5-7 visual elements or graphics to include],
  "examples": [array of 4-5 concrete examples or scenarios],
  "key_takeaways": [array of 4-5 essential learnings],
  "script_outline": [detailed outline with timing breakdown and section descriptions]
}

Make the brief specific to the lesson content and appropriate for the ${body.duration}-minute duration.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic error:", await response.text());
      return NextResponse.json(
        { success: false, error: "Failed to generate brief" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    let parsed = JSON.parse(content);
    if (parsed.brief && typeof parsed.brief === "object") {
      parsed = parsed.brief;
    }

    const brief: ContentBrief = {
      talking_points: parsed.talking_points || [],
      visual_cues: parsed.visual_cues || [],
      examples: parsed.examples || [],
      key_takeaways: parsed.key_takeaways || [],
      script_outline: parsed.script_outline || "",
    };

    return NextResponse.json({ success: true, brief });
  } catch (error) {
    console.error("Brief generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate brief" },
      { status: 500 }
    );
  }
}
