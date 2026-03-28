import { NextRequest, NextResponse } from "next/server";
import { ContentType } from "@/types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface GenerateContentRequest {
  transcript: string;
  videoTitle: string;
  lessonTitle: string;
  contentTypes: ContentType[];
}

interface GeneratedContent {
  type: ContentType;
  title: string;
  content: string;
  duration?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateContentRequest = await req.json();

    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your-anthropic-key") {
      // Fallback: return basic content
      return NextResponse.json({
        success: true,
        content: generateFallbackContent(body),
      });
    }

    const contentTypesStr = body.contentTypes.join(", ");

    const systemPrompt = `You are CourseForge AI — an expert instructional designer. Your task is to generate high-quality learning content items from video transcripts.

Generate content items for the following types: ${contentTypesStr}

For each content type:
- Reading: Create a structured, text-based summary (5-30 min read)
- Practice Quiz: Generate 5-8 multiple choice questions with explanations (15-30 min)
- Graded Quiz: Generate 5-10 rigorous assessment questions (30-60 min)
- Discussion: Create thought-provoking discussion prompts (10-20 min)
- Case Study: Develop a real-world scenario based on the content (30-45 min)
- Glossary: Extract and define key terms (10-15 min)
- AI Dialogue: Create an interactive dialogue about the concepts (15-25 min)

Return valid JSON only with the following structure:
{
  "contentItems": [
    {
      "type": "reading",
      "title": "...",
      "content": "...",
      "duration": "15 min"
    }
  ]
}`;

    const userPrompt = `Video: "${body.videoTitle}"
Lesson: "${body.lessonTitle}"

Transcript:
${body.transcript}

Please generate ${contentTypesStr} content items from this transcript.`;

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
        content: generateFallbackContent(body),
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return NextResponse.json({
        success: true,
        content: generateFallbackContent(body),
      });
    }

    let parsed = JSON.parse(content);
    if (parsed.contentItems && Array.isArray(parsed.contentItems)) {
      return NextResponse.json({ success: true, content: parsed.contentItems });
    }

    return NextResponse.json({
      success: true,
      content: generateFallbackContent(body),
    });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json({
      success: true,
      content: generateFallbackContent(
        req.body as unknown as GenerateContentRequest
      ),
    });
  }
}

function generateFallbackContent(
  params: GenerateContentRequest
): GeneratedContent[] {
  const content: GeneratedContent[] = [];

  if (params.contentTypes.includes("reading")) {
    content.push({
      type: "reading",
      title: `Reading: Key Concepts from ${params.videoTitle}`,
      content: `This reading summarizes the main concepts covered in "${params.videoTitle}". Key topics include the definition of core concepts, their importance in the context of "${params.lessonTitle}", and practical applications. Students should review this material to reinforce understanding of the video content.`,
      duration: "20 min",
    });
  }

  if (params.contentTypes.includes("practice_quiz")) {
    content.push({
      type: "practice_quiz",
      title: `Practice Quiz: ${params.lessonTitle}`,
      content: JSON.stringify({
        questions: [
          {
            question: "What is the main concept covered in this lesson?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
            explanation:
              "This is the primary concept discussed in the video.",
          },
          {
            question: "How would you apply this concept in practice?",
            options: ["Approach 1", "Approach 2", "Approach 3", "Approach 4"],
            correctAnswer: 0,
            explanation: "This approach is most practical based on the content.",
          },
        ],
      }),
      duration: "20 min",
    });
  }

  if (params.contentTypes.includes("discussion")) {
    content.push({
      type: "discussion",
      title: `Discussion: Real-World Applications`,
      content: `Consider how the concepts from "${params.videoTitle}" apply to your own experience or industry. What challenges have you encountered that could be addressed using these principles? Share your thoughts and engage with your peers' perspectives.`,
      duration: "15 min",
    });
  }

  if (params.contentTypes.includes("case_study")) {
    content.push({
      type: "case_study",
      title: `Case Study: ${params.lessonTitle} in Practice`,
      content: `A software development team was facing challenges with ${params.lessonTitle}. They decided to implement the strategies discussed in this lesson. Analyze their approach, identify what went well, and suggest improvements for their implementation. Consider both technical and organizational factors.`,
      duration: "40 min",
    });
  }

  if (params.contentTypes.includes("glossary")) {
    content.push({
      type: "glossary",
      title: `Glossary: Key Terms`,
      content: JSON.stringify({
        terms: [
          {
            term: "Core Concept",
            definition:
              "A fundamental principle introduced in this lesson that forms the basis for further learning.",
          },
          {
            term: "Application",
            definition:
              "The practical use of the core concepts in real-world scenarios.",
          },
        ],
      }),
      duration: "10 min",
    });
  }

  if (params.contentTypes.includes("ai_dialogue")) {
    content.push({
      type: "ai_dialogue",
      title: `Interactive Dialogue: Exploring ${params.lessonTitle}`,
      content: `Engage in an interactive conversation with an AI assistant about the concepts from "${params.videoTitle}". Ask questions about applications, edge cases, and deeper understanding of the material. The AI will provide explanations tailored to your level of understanding.`,
      duration: "20 min",
    });
  }

  return content;
}
