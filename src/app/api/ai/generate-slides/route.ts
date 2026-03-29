import { NextRequest, NextResponse } from "next/server";
import { PPTSlide } from "@/types";

interface ContentBrief {
  what_to_cover: string;
  examples: string;
  visual_cues: string;
  key_takeaways: string;
  script_outline: string;
}

interface GenerateSlidesRequest {
  videoId: string;
  videoTitle: string;
  brief: ContentBrief;
  slideCount?: number;
  isHandson?: boolean;
}

function generateFallbackSlides(request: GenerateSlidesRequest): PPTSlide[] {
  const slideCount = request.slideCount || 6;
  const slides: PPTSlide[] = [];
  const layouts: Array<PPTSlide["layout_type"]> = [
    "title",
    "content",
    "two_column",
    "diagram",
    "content",
    "summary",
  ];

  for (let i = 0; i < slideCount; i++) {
    const layout = layouts[i % layouts.length];
    const slideNumber = i + 1;

    let title = "";
    let content = "";

    switch (i) {
      case 0:
        title = request.videoTitle;
        content = "Learning Objectives & Overview";
        break;
      case 1:
        title = "Core Concepts";
        content = "Key definitions and foundational principles";
        break;
      case slideCount - 1:
        title = "Summary & Next Steps";
        content = "Key takeaways and what comes next";
        break;
      default:
        title = `Topic ${i}`;
        content = "Key points and examples";
    }

    slides.push({
      id: `slide-${request.videoId}-${slideNumber}`,
      video_id: request.videoId,
      lesson_id: "",
      course_id: "",
      slide_number: slideNumber,
      title,
      content,
      notes: `Speaker notes for ${title}`,
      layout_type: layout,
      has_animation: i > 0 && i < slideCount - 1,
      is_uploaded: false,
      status: "generated",
    });
  }

  return slides;
}

async function generateWithAI(request: GenerateSlidesRequest): Promise<PPTSlide[]> {
  const slideCount = request.slideCount || 6;

  const prompt = `You are an expert presentation designer. Generate ${slideCount} PowerPoint slides for a video lesson.

Video Title: ${request.videoTitle}
Content Brief:
${JSON.stringify(request.brief, null, 2)}

Is Hands-on: ${request.isHandson || false}

Create ${slideCount} slides as a JSON array with this structure for each slide:
{
  "slide_number": number,
  "title": string (concise title, 5-10 words max),
  "content": string (main content, 20-50 words),
  "notes": string (speaker notes),
  "layout_type": "title" | "content" | "two_column" | "diagram" | "summary" | "code",
  "has_animation": boolean,
  "status": "generated"
}

Guidelines:
- Slide 1: Title slide with video title and key topic
- Slides 2-4: Main content, one concept per slide
- Slide 5: Examples and application
- Slide 6: Summary and key takeaways
${request.isHandson ? "- Include code/implementation examples" : ""}
- Use 'two_column' for comparisons
- Use 'diagram' for processes or relationships
- Make content concise and visually scannable
- Include speaker notes for delivery guidance
- Limit animation to 3-4 slides only

Return ONLY a JSON array of ${slideCount} slide objects.`;

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

    const slides: PPTSlide[] = slidesData.map((s, idx) => ({
      id: `slide-${request.videoId}-${idx + 1}`,
      video_id: request.videoId,
      lesson_id: "",
      course_id: "",
      slide_number: s.slide_number || idx + 1,
      title: s.title || `Slide ${idx + 1}`,
      content: s.content || "",
      notes: s.notes,
      layout_type: (s.layout_type || "content") as PPTSlide["layout_type"],
      has_animation: s.has_animation || false,
      is_uploaded: false,
      status: s.status || "generated",
    }));

    return slides;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackSlides(request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateSlidesRequest;

    const slides = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackSlides(body);

    return NextResponse.json({ slides });
  } catch (error) {
    console.error("Error in /api/ai/generate-slides:", error);
    return NextResponse.json(
      { error: "Failed to generate slides" },
      { status: 500 }
    );
  }
}
