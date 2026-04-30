import { NextRequest, NextResponse } from "next/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";

type ContentType =
  | "reading"
  | "practice_quiz"
  | "graded_quiz"
  | "discussion"
  | "case_study"
  | "ai_dialogue"
  | "peer_review";

interface GenerateContentRequest {
  lessonId: string;
  lessonTitle: string;
  type: ContentType;
  courseTitle: string;
  moduleTitle: string;
}

interface ContentItem {
  title: string;
  content: string;
  type: ContentType;
}

function generateFallbackContent(request: GenerateContentRequest): ContentItem {
  const baseContent: Record<ContentType, ContentItem> = {
    reading: {
      title: `Reading: ${request.lessonTitle} Fundamentals`,
      type: "reading",
      content: `# ${request.lessonTitle} Fundamentals\n\nThis reading covers the essential concepts of ${request.lessonTitle} as part of the ${request.moduleTitle} module in ${request.courseTitle}.\n\n## Key Concepts\n- Core principles\n- Practical applications\n- Real-world examples\n\n## Learning Outcomes\nAfter completing this reading, you will understand the fundamental concepts and be able to apply them in practical contexts.`,
    },
    practice_quiz: {
      title: "Practice Quiz: Check Your Understanding",
      type: "practice_quiz",
      content: JSON.stringify({
        questions: [
          {
            id: "q1",
            question: `What is the main concept of ${request.lessonTitle}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: 0,
            explanation: "This is the foundational concept...",
          },
          {
            id: "q2",
            question: `How would you apply ${request.lessonTitle} in practice?`,
            options: ["Approach A", "Approach B", "Approach C", "Approach D"],
            correct_answer: 1,
            explanation: "This approach aligns with best practices...",
          },
          {
            id: "q3",
            question: `What are the key benefits of understanding ${request.lessonTitle}?`,
            options: ["Benefit A", "Benefit B", "Benefit C", "Benefit D"],
            correct_answer: 2,
            explanation: "These benefits are most relevant to professional practice...",
          },
        ],
        passing_score: 70,
      }),
    },
    graded_quiz: {
      title: "Graded Assessment: ${request.lessonTitle}",
      type: "graded_quiz",
      content: JSON.stringify({
        questions: [
          {
            id: "gq1",
            question: `Comprehensive question about ${request.lessonTitle}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: 0,
            explanation: "Detailed explanation here...",
            weight: 25,
          },
          {
            id: "gq2",
            question: `Advanced application scenario for ${request.lessonTitle}`,
            options: ["Scenario A", "Scenario B", "Scenario C", "Scenario D"],
            correct_answer: 1,
            explanation: "This scenario demonstrates proper understanding...",
            weight: 25,
          },
          {
            id: "gq3",
            question: `Critical thinking question about ${request.lessonTitle}`,
            options: ["Analysis A", "Analysis B", "Analysis C", "Analysis D"],
            correct_answer: 2,
            explanation: "Critical analysis reveals...",
            weight: 25,
          },
          {
            id: "gq4",
            question: `Integration question connecting ${request.lessonTitle} to ${request.moduleTitle}`,
            options: ["Connection A", "Connection B", "Connection C", "Connection D"],
            correct_answer: 3,
            explanation: "The integration shows how concepts relate...",
            weight: 25,
          },
        ],
        passing_score: 80,
        time_limit_minutes: 30,
      }),
    },
    discussion: {
      title: "Discussion: Share Your Perspective",
      type: "discussion",
      content: `## Discussion Prompt\n\nConsider the following question about ${request.lessonTitle}:\n\n**How would you approach ${request.lessonTitle} in your own professional context?**\n\n### Guidelines\n- Share at least one concrete example from your experience\n- Respond thoughtfully to at least two classmates' posts\n- Respect different perspectives and approaches\n- Connect your response to the key concepts from ${request.moduleTitle}\n\n### Starter Questions\n- What challenges do you anticipate when implementing these concepts?\n- How might ${request.lessonTitle} change your current practice?\n- What questions remain unanswered for you?`,
    },
    case_study: {
      title: `Case Study: Real-World Application of ${request.lessonTitle}`,
      type: "case_study",
      content: `# Case Study: ${request.lessonTitle} in Practice\n\n## Background\nA team in the ${request.moduleTitle} space faced significant challenges related to ${request.lessonTitle}. They needed to implement best practices while managing constraints and stakeholder concerns.\n\n## The Challenge\n- Situation: Organization was struggling with core aspects of ${request.lessonTitle}\n- Stakeholders: Multiple teams with different perspectives\n- Constraints: Time, budget, and resource limitations\n- Goals: Improve outcomes while maintaining quality\n\n## The Solution\nThe team took a systematic approach:\n1. Assessed current state against best practices\n2. Identified quick wins and long-term improvements\n3. Implemented changes incrementally\n4. Measured results and adjusted as needed\n\n## Results & Outcomes\n- Improved efficiency in ${request.lessonTitle} implementation\n- Better team alignment and understanding\n- Measurable improvements in key metrics\n- Sustainability of changes over time\n\n## Key Takeaways\n- Understanding context is crucial\n- Incremental implementation reduces resistance\n- Measurement drives improvement\n- Team buy-in is essential for success\n\n## Reflection Questions\n1. How does this case relate to your own experience?\n2. What would you have done differently?\n3. How could you apply these lessons in your context?`,
    },
    ai_dialogue: {
      title: `AI-Assisted Learning: ${request.lessonTitle} Q&A`,
      type: "ai_dialogue",
      content: `# Interactive AI Dialogue\n\n## About This Activity\nIn this activity, you'll engage in a conversation with an AI assistant to deepen your understanding of ${request.lessonTitle}. The AI will answer questions, provide clarifications, and guide you through scenarios.\n\n## How to Use\n1. Ask questions about any aspect of ${request.lessonTitle}\n2. Request examples or clarifications\n3. Work through hypothetical scenarios\n4. Challenge your understanding\n5. Explore edge cases and exceptions\n\n## Sample Topics to Explore\n- Core concepts and definitions of ${request.lessonTitle}\n- How ${request.lessonTitle} applies in ${request.moduleTitle}\n- Common misconceptions about ${request.lessonTitle}\n- Advanced applications and variations\n- Integration with other course concepts\n\n## Tips for Effective Learning\n- Ask specific, clear questions\n- Follow up on unclear explanations\n- Request examples when concepts are abstract\n- Test your understanding by explaining back\n- Explore real-world scenarios relevant to your context`,
    },
    peer_review: {
      title: `Peer Review: Evaluating ${request.lessonTitle} Applications`,
      type: "peer_review",
      content: `# Peer Review Activity\n\nIn this activity, you will review and provide constructive feedback on your peers' work related to ${request.lessonTitle}.\n\n## Review Criteria\n- Conceptual Understanding (25%)\n- Practical Application (25%)\n- Quality of Analysis (25%)\n- Presentation and Clarity (25%)\n\n## Feedback Guidelines\n- Be specific and constructive\n- Balance positive observations with suggestions\n- Connect feedback to course concepts`,
    },
  };

  return baseContent[request.type];
}

async function generateWithAI(
  request: GenerateContentRequest
): Promise<ContentItem> {
  const typeDescriptions: Record<ContentType, string> = {
    reading:
      "comprehensive reading material with key concepts, examples, and learning outcomes in markdown format",
    practice_quiz:
      "interactive quiz with 3 questions to help learners practice and check their understanding",
    graded_quiz:
      "comprehensive assessment with 4 questions weighted to evaluate mastery of the content",
    discussion:
      "discussion prompt that encourages peer interaction and practical application of concepts",
    case_study:
      "real-world scenario demonstrating practical application with context, challenges, solution, and results",
    ai_dialogue:
      "interactive Q&A conversation starter for learners to ask questions and explore the topic with an AI assistant",
    peer_review:
      "structured peer review activity with clear criteria for evaluating classmate work",
  };

  const prompt = `You are an expert instructional designer. Generate a specific content item for a lesson.

Course: ${request.courseTitle}
Module: ${request.moduleTitle}
Lesson: ${request.lessonTitle}
Content Type: ${request.type}

Create a single content item of type "${request.type}" as JSON with these fields:
{
  "title": string (descriptive title),
  "content": string (the actual content - for quizzes use JSON structure, for others use markdown or text),
  "type": "${request.type}"
}

Content type details - "${request.type}": ${typeDescriptions[request.type]}

Requirements:
- Content must be detailed and well-structured
- For quizzes: include JSON with questions array containing question, options[], correct_answer index, and explanation
- For readings: use markdown formatting with sections and bullet points
- For discussions/case studies: provide clear structure with prompts and guidance
- For peer review: include evaluation criteria and feedback guidelines
- Align content with both the lesson and broader module concepts
- Practical and implementation-focused
- Appropriate difficulty level for the course context

Return ONLY the JSON object with title, content, and type fields.`;

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
      return generateFallbackContent(request);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackContent(request);
    }

    const item = JSON.parse(jsonMatch[0]) as ContentItem;
    return item;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackContent(request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateContentRequest;

    // Validate content type
    const validTypes: ContentType[] = [
      "reading",
      "practice_quiz",
      "graded_quiz",
      "discussion",
      "case_study",
      "ai_dialogue",
      "peer_review",
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid content type: ${body.type}` },
        { status: 400, headers: aiHeaders(aiMode()) }
      );
    }

    const content = process.env.ANTHROPIC_API_KEY
      ? await generateWithAI(body)
      : generateFallbackContent(body);

    return NextResponse.json({ success: true, content }, { headers: aiHeaders(aiMode()) });
  } catch (error) {
    console.error("Error in /api/ai/generate-content:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate content" },
      { status: 500, headers: aiHeaders(aiMode()) }
    );
  }
}
