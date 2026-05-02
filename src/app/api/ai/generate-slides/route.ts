import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

interface ContentBrief {
  talking_points: string;
  visual_cues: string;
  key_takeaways: string;
  script_outline: string;
  estimated_duration: string;
  status: string;
}

interface GenerateSlidesRequest {
  videoId: string;
  videoTitle: string;
  brief: ContentBrief;
  courseTitle: string;
}

interface SlideData {
  title: string;
  content: string;
  speaker_notes: string;
  layout_type: "title" | "content" | "two_column" | "diagram" | "summary" | "code";
  order: number;
}

function generateFallbackSlides(request: GenerateSlidesRequest): SlideData[] {
  const slides: SlideData[] = [
    {
      title: request.videoTitle,
      content: "Learning Objectives & Overview",
      speaker_notes: `Welcome to ${request.videoTitle}. In this video, we'll cover the key concepts and practical applications.`,
      layout_type: "title",
      order: 1,
    },
    {
      title: "Core Concepts",
      content: "Key definitions and foundational principles",
      speaker_notes: "Let's start by understanding the fundamental concepts...",
      layout_type: "content",
      order: 2,
    },
    {
      title: "Key Principles",
      content: "Essential theories and frameworks",
      speaker_notes: "These principles form the foundation for practical application...",
      layout_type: "content",
      order: 3,
    },
    {
      title: "Real-World Examples",
      content: "Practical applications and case studies",
      speaker_notes: "Here are some concrete examples showing how these concepts work in practice...",
      layout_type: "two_column",
      order: 4,
    },
    {
      title: "Best Practices",
      content: "Common mistakes and how to avoid them",
      speaker_notes: "Remember these best practices to ensure success...",
      layout_type: "content",
      order: 5,
    },
    {
      title: "Summary & Next Steps",
      content: "Key takeaways and what comes next",
      speaker_notes: "Let's recap what we've learned and discuss next steps...",
      layout_type: "summary",
      order: 6,
    },
  ];

  return slides;
}

async function generateWithAI(
  request: GenerateSlidesRequest
): Promise<SlideData[]> {
  const prompt = `You are an expert presentation designer. Generate 6 PowerPoint slides for a video lesson.

Course: ${request.courseTitle}
Video Title: ${request.videoTitle}
Content Brief:
${JSON.stringify(request.brief, null, 2)}

Create 6 slides as a JSON array with this structure for each slide:
{
  "title": string (concise title, 5-10 words max),
  "content": string (main content, 20-50 words),
  "speaker_notes": string (detailed speaker notes for delivery),
  "layout_type": "title" | "content" | "two_column" | "diagram" | "summary" | "code",
  "order": number
}

Guidelines:
- Slide 1: Title slide with video title and key topic
- Slides 2-4: Main content, one concept per slide
- Slide 5: Examples and best practices
- Slide 6: Summary and key takeaways
- Use 'two_column' for comparisons
- Use 'diagram' for processes or relationships
- Make content concise and visually scannable
- Include detailed speaker notes for delivery guidance

Return ONLY a JSON array of 6 slide objects.`;

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
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return generateFallbackSlides(request);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return generateFallbackSlides(request);
    }

    const slidesData = JSON.parse(jsonMatch[0]) as Array<any>;

    const slides: SlideData[] = slidesData.map((s, idx) => ({
      title: s.title || `Slide ${idx + 1}`,
      content: s.content || "",
      speaker_notes: s.speaker_notes || "",
      layout_type: (s.layout_type || "content") as SlideData["layout_type"],
      order: s.order || idx + 1,
    }));

    return slides;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackSlides(request);
  }
}

export async function POST(request: NextRequest) {
  try {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  // SEC-4: per-org rate limit
  const __rl = await checkRateLimit(auth.orgId, "generate-slides");
  if (!__rl.ok) return rateLimitResponse(__rl);

    const body = (await request.json()) as GenerateSlidesRequest;

    const slides = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackSlides(body);

    return NextResponse.json({ success: true, slides }, { headers: aiHeaders(aiMode()) });
  } catch (error) {
    console.error("Error in /api/ai/generate-slides:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate slides" },
      { status: 500, headers: aiHeaders(aiMode()) }
    );
  }
}
