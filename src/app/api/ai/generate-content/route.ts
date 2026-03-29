import { NextRequest, NextResponse } from "next/server";
import { ContentItem, ContentType } from "@/types";

interface GenerateContentRequest {
  lessonId: string;
  lessonTitle: string;
  transcript: string;
  contentTypes: ContentType[];
}

function generateFallbackContent(request: GenerateContentRequest): ContentItem[] {
  const items: ContentItem[] = [];
  let order = 0;

  // Reading material
  if (request.contentTypes.includes("reading")) {
    items.push({
      id: `content-${request.lessonId}-${order}`,
      lesson_id: request.lessonId,
      type: "reading",
      title: `Reading: ${request.lessonTitle} Fundamentals`,
      description: "Comprehensive reading material covering key concepts",
      order: order++,
      status: "generated",
      content: `# ${request.lessonTitle} Fundamentals\n\nThis reading covers the essential concepts of ${request.lessonTitle}...`,
    });
  }

  // Practice quiz
  if (request.contentTypes.includes("practice_quiz")) {
    items.push({
      id: `content-${request.lessonId}-${order}`,
      lesson_id: request.lessonId,
      type: "practice_quiz",
      title: "Practice Quiz: Check Your Understanding",
      description: "5-question practice quiz to reinforce learning",
      order: order++,
      status: "generated",
      content: JSON.stringify({
        questions: [
          {
            q: "What is the main concept in this lesson?",
            options: ["Option A", "Option B", "Option C"],
            correct: 0,
          },
          {
            q: "How would you apply this concept?",
            options: ["Scenario A", "Scenario B", "Scenario C"],
            correct: 1,
          },
        ],
      }),
    });
  }

  // Case study
  if (request.contentTypes.includes("case_study")) {
    items.push({
      id: `content-${request.lessonId}-${order}`,
      lesson_id: request.lessonId,
      type: "case_study",
      title: "Case Study: Real-World Application",
      description: "Real-world scenario demonstrating practical application",
      order: order++,
      status: "generated",
      content: `# Case Study: ${request.lessonTitle} in Practice\n\nBackground: A company faced challenges with ${request.lessonTitle}...\n\nSolution: They implemented...\n\nOutcomes: The results were...`,
    });
  }

  // Discussion prompt
  if (request.contentTypes.includes("discussion")) {
    items.push({
      id: `content-${request.lessonId}-${order}`,
      lesson_id: request.lessonId,
      type: "discussion",
      title: "Discussion: Share Your Perspective",
      description: "Engage with peers on key concepts",
      order: order++,
      status: "generated",
      content: `Consider the following question:\n\nHow would you approach ${request.lessonTitle} in your own work context?\n\nShare your thoughts and respond to at least 2 classmates.`,
    });
  }

  // Glossary
  if (request.contentTypes.includes("glossary")) {
    items.push({
      id: `content-${request.lessonId}-${order}`,
      lesson_id: request.lessonId,
      type: "glossary",
      title: "Key Terminology",
      description: "Essential terms and definitions",
      order: order++,
      status: "generated",
      content: JSON.stringify({
        terms: [
          { term: "Core Concept", definition: "The fundamental idea underlying this lesson" },
          { term: "Application", definition: "How this concept is used in practice" },
          { term: "Best Practice", definition: "The recommended approach for this topic" },
        ],
      }),
    });
  }

  // If no specific types requested, provide defaults
  if (items.length === 0) {
    items.push({
      id: `content-${request.lessonId}-0`,
      lesson_id: request.lessonId,
      type: "reading",
      title: `Reading: ${request.lessonTitle}`,
      description: "Core reading material",
      order: 0,
      status: "generated",
      content: `Lesson content for ${request.lessonTitle}`,
    });
  }

  return items;
}

async function generateWithAI(request: GenerateContentRequest): Promise<ContentItem[]> {
  const typesText = request.contentTypes.join(", ");

  const prompt = `You are an expert instructional designer. Generate supplementary content items based on a video transcript.

Lesson Title: ${request.lessonTitle}
Content Types Needed: ${typesText}

Video Transcript:
${request.transcript.substring(0, 2000)}${request.transcript.length > 2000 ? "..." : ""}

Create content items as a JSON array. For each item:
{
  "type": "${request.contentTypes[0]}" | other content types,
  "title": string,
  "description": string (40-60 words),
  "content": string (the actual content or JSON structure),
  "order": number
}

Generate these content types if requested:
- "reading": Formatted text (markdown) with key concepts
- "practice_quiz": JSON with questions array, each with q, options[], correct index
- "case_study": Real-world scenario with context, challenge, solution
- "discussion": Discussion prompt encouraging peer interaction
- "glossary": JSON with terms array, each with term and definition
- "graded_quiz": Comprehensive assessment (JSON format like practice_quiz)
- "plugin": Interactive element (describe in content)

Requirements:
- Content must align with and expand on the transcript
- Use concrete examples from the video
- Provide 2-3 items matching requested types
- Keep content focused and practical
- Make JSON content properly formatted

Return ONLY a JSON array of content items.`;

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
      return generateFallbackContent(request);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return generateFallbackContent(request);
    }

    const itemsData = JSON.parse(jsonMatch[0]) as Array<any>;

    const items: ContentItem[] = itemsData.map((item, idx) => ({
      id: `content-${request.lessonId}-${idx}`,
      lesson_id: request.lessonId,
      type: (item.type || "reading") as ContentType | "video",
      title: item.title || `Content ${idx + 1}`,
      description: item.description,
      order: item.order ?? idx,
      status: item.status || "generated",
      content: typeof item.content === "string" ? item.content : JSON.stringify(item.content),
    }));

    return items;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackContent(request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateContentRequest;

    const items = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackContent(body);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error in /api/ai/generate-content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
