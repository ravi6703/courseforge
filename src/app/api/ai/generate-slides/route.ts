import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface GenerateSlidesRequest {
  videoTitle: string;
  lessonTitle: string;
  moduleName: string;
  duration: number;
  talkingPoints?: string[];
  courseName: string;
}

interface SlideObject {
  slide_number: number;
  title: string;
  content: string[];
  speaker_notes: string;
  layout_type: "title" | "content" | "two_column" | "image_text";
}

interface GenerateSlidesResponse {
  success: boolean;
  slides: SlideObject[];
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateSlidesResponse>> {
  try {
    const body: GenerateSlidesRequest = await req.json();

    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your-anthropic-key") {
      // Fallback: return realistic slide data
      return NextResponse.json({
        success: true,
        slides: generateFallbackSlides(body),
      });
    }

    const talkingPointsStr = body.talkingPoints
      ? body.talkingPoints.join("\n- ")
      : "";

    const systemPrompt = `You are CourseForge AI — an expert instructional designer specializing in presentation design. Your task is to generate high-quality PowerPoint slides from course content.

Generate 5-8 slides with the following structure:
- Each slide must have a slide_number, title, content array (bullet points), speaker_notes, and layout_type
- Layout types: "title" (cover slide), "content" (text and bullets), "two_column" (side-by-side layout), or "image_text" (visual with text)
- Speaker notes should be detailed speaker talking points (2-3 sentences)
- Content should be concise bullet points (max 5 per slide)
- The first slide should be a title slide with layout_type "title"
- Content should be educational, clear, and aligned with the lesson objectives

Return valid JSON only with the following structure:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "...",
      "content": ["...", "..."],
      "speaker_notes": "...",
      "layout_type": "title"
    }
  ]
}`;

    const userPrompt = `Course: "${body.courseName}"
Module: "${body.moduleName}"
Lesson: "${body.lessonTitle}"
Video: "${body.videoTitle}"
Duration: ${body.duration} minutes
${
  body.talkingPoints && body.talkingPoints.length > 0
    ? `Key Talking Points:\n- ${talkingPointsStr}`
    : ""
}

Please generate 5-8 high-quality PowerPoint slides for this lesson. Start with a title slide, then create content slides covering the main concepts and key takeaways. Ensure the slides are visually balanced and include appropriate speaker notes for each slide.`;

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
      return NextResponse.json({
        success: true,
        slides: generateFallbackSlides(body),
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return NextResponse.json({
        success: true,
        slides: generateFallbackSlides(body),
      });
    }

    let parsed = JSON.parse(content);
    if (parsed.slides && Array.isArray(parsed.slides)) {
      return NextResponse.json({ success: true, slides: parsed.slides });
    }

    return NextResponse.json({
      success: true,
      slides: generateFallbackSlides(body),
    });
  } catch (error) {
    console.error("Slide generation error:", error);
    return NextResponse.json({
      success: true,
      slides: generateFallbackSlides(
        (await req.json().catch(() => ({}))) as GenerateSlidesRequest
      ),
    });
  }
}

function generateFallbackSlides(params: GenerateSlidesRequest): SlideObject[] {
  const slides: SlideObject[] = [];

  // Slide 1: Title Slide
  slides.push({
    slide_number: 1,
    title: params.videoTitle,
    content: [params.lessonTitle, params.moduleName, `Course: ${params.courseName}`],
    speaker_notes: `Welcome to today's lesson on ${params.lessonTitle}. This session is part of the ${params.moduleName} module in ${params.courseName}. We'll be covering key concepts and practical applications over the next ${params.duration} minutes.`,
    layout_type: "title",
  });

  // Slide 2: Learning Objectives
  slides.push({
    slide_number: 2,
    title: "Learning Objectives",
    content: [
      "Understand the core concepts and frameworks",
      "Identify key principles and best practices",
      "Apply knowledge to real-world scenarios",
      "Engage with practical examples",
    ],
    speaker_notes: "By the end of this lesson, you will be able to understand the fundamental concepts, recognize key principles in action, and apply these ideas to your own work or studies.",
    layout_type: "content",
  });

  // Slide 3: Key Concepts
  slides.push({
    slide_number: 3,
    title: "Core Concepts & Definitions",
    content: [
      "Foundation: Understanding the fundamental principles",
      "Framework: How concepts relate and interconnect",
      "Application: Practical use cases and examples",
      "Best Practices: Industry standards and approaches",
    ],
    speaker_notes: "Let's start with the foundational concepts. We need to understand what these terms mean, how they fit together, and where we see them applied in real situations. These best practices have been developed through years of experience.",
    layout_type: "content",
  });

  // Slide 4: Main Content/Detailed Discussion
  slides.push({
    slide_number: 4,
    title: "Implementation & Strategy",
    content: [
      "Step 1: Assessment and Planning",
      "Step 2: Development and Design",
      "Step 3: Execution and Monitoring",
      "Step 4: Evaluation and Refinement",
    ],
    speaker_notes: "The process requires careful planning and execution. First, we assess the current situation and plan our approach. Then we develop a strategy tailored to our needs. Finally, we monitor progress and refine as we learn.",
    layout_type: "content",
  });

  // Slide 5: Real-World Examples
  slides.push({
    slide_number: 5,
    title: "Practical Examples & Case Studies",
    content: [
      "Example 1: Successful implementation in industry",
      "Key success factors and challenges overcome",
      "Lessons learned and insights gained",
      "How to adapt these approaches to your context",
    ],
    speaker_notes: "These real-world examples show how organizations have successfully applied these concepts. Notice the common success factors: clear planning, stakeholder buy-in, iterative refinement, and measuring results.",
    layout_type: "two_column",
  });

  // Slide 6: Key Takeaways
  slides.push({
    slide_number: 6,
    title: "Key Takeaways",
    content: [
      "Remember the core principles and frameworks",
      "Consider how these apply to your specific context",
      "Start small and iterate based on feedback",
      "Measure and refine your approach continuously",
    ],
    speaker_notes: "The most important things to remember are the core principles we discussed. Think about how you can apply these in your own work. Success comes from starting with a solid foundation and continuously improving based on results.",
    layout_type: "content",
  });

  // Slide 7: Next Steps & Resources
  slides.push({
    slide_number: 7,
    title: "Next Steps & Resources",
    content: [
      "Review the lesson materials and references",
      "Complete the practice exercises and assessments",
      "Engage in discussion forums with peers",
      "Apply concepts to your own projects and work",
    ],
    speaker_notes: "To reinforce your learning, make sure to review the materials provided. Complete the practice exercises to test your understanding. Discuss with your peers how you might apply these concepts, and share your experiences with the community.",
    layout_type: "content",
  });

  return slides;
}
