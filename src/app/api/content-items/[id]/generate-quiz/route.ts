import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct_answer: string;
  explanation: string;
  bloom_level: string;
}

interface GeneratedQuiz {
  questions: QuizQuestion[];
  metadata: {
    total_questions: number;
    difficulty_level: string;
    estimated_time_minutes: number;
    content_item_id: string;
  };
}

interface ContentItemData {
  title: string;
  description?: string;
  learning_objectives?: string[];
  difficulty_level?: string;
  config?: Record<string, unknown>;
}

async function generateQuizWithClaude(
  contentItem: ContentItemData
): Promise<QuizQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return placeholder quiz
    return generatePlaceholderQuiz(contentItem);
  }

  const prompt = `You are an expert assessment designer. Generate a quiz for the following content:

Title: ${contentItem.title}
Description: ${contentItem.description || "No description provided"}
Learning Objectives: ${(contentItem.learning_objectives || []).join(", ") || "None provided"}
Difficulty Level: ${contentItem.difficulty_level || "intermediate"}

Generate exactly 5 multiple-choice questions that:
1. Test understanding of the content
2. Follow Bloom's Taxonomy (Remember, Understand, Apply, Analyze, Evaluate)
3. Have one clearly correct answer and plausible distractors
4. Include brief explanations for why the correct answer is right

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": {
        "a": "Option A",
        "b": "Option B",
        "c": "Option C",
        "d": "Option D"
      },
      "correct_answer": "a",
      "explanation": "Why this is correct and why others are wrong",
      "bloom_level": "Understand"
    }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Claude API error:", error);
      return generatePlaceholderQuiz(contentItem);
    }

    const data = await response.json();
    const textContent = data.content.find(
      (c: { type: string; text: string }) => c.type === "text"
    );

    if (!textContent || textContent.type !== "text") {
      return generatePlaceholderQuiz(contentItem);
    }

    const parsedResponse = JSON.parse(textContent.text);
    return parsedResponse.questions.map(
      (q: Omit<QuizQuestion, "id">, index: number) => ({
        id: `q${index + 1}`,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        bloom_level: q.bloom_level || "Understand",
      })
    );
  } catch (error) {
    console.error("Error generating quiz with Claude:", error);
    return generatePlaceholderQuiz(contentItem);
  }
}

function generatePlaceholderQuiz(contentItem: ContentItemData): QuizQuestion[] {
  const questions: QuizQuestion[] = [
    {
      id: "q1",
      question: `What is the primary focus of "${contentItem.title}"?`,
      options: {
        a: "Option A related to the topic",
        b: "Option B related to the topic",
        c: "Option C related to the topic",
        d: "Option D related to the topic",
      },
      correct_answer: "a",
      explanation:
        "This is a placeholder question. Configure ANTHROPIC_API_KEY to generate AI-powered quizzes.",
      bloom_level: "Understand",
    },
    {
      id: "q2",
      question: "How would you apply the concepts from this content?",
      options: {
        a: "Practical application A",
        b: "Practical application B",
        c: "Practical application C",
        d: "Practical application D",
      },
      correct_answer: "b",
      explanation:
        "Placeholder explanation. AI-generated quizzes will have dynamic, contextual content.",
      bloom_level: "Apply",
    },
    {
      id: "q3",
      question: "Which of the following best describes a key concept?",
      options: {
        a: "Description A",
        b: "Description B",
        c: "Description C",
        d: "Description D",
      },
      correct_answer: "c",
      explanation:
        "Placeholder question - enable API key for full functionality.",
      bloom_level: "Understand",
    },
    {
      id: "q4",
      question: "What would be the consequence of...?",
      options: {
        a: "Consequence A",
        b: "Consequence B",
        c: "Consequence C",
        d: "Consequence D",
      },
      correct_answer: "b",
      explanation: "Placeholder explanation for higher-order thinking.",
      bloom_level: "Analyze",
    },
    {
      id: "q5",
      question:
        "In what scenario would this approach be most appropriate?",
      options: {
        a: "Scenario A",
        b: "Scenario B",
        c: "Scenario C",
        d: "Scenario D",
      },
      correct_answer: "d",
      explanation:
        "Placeholder question demonstrating evaluation-level thinking.",
      bloom_level: "Evaluate",
    },
  ];

  return questions;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const itemId = params.id;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the content item to use for context
    const { data: contentItem, error: fetchError } = await supabase
      .from("toc_items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (fetchError || !contentItem) {
      return NextResponse.json(
        { error: "Content item not found" },
        { status: 404 }
      );
    }

    // Generate quiz questions
    const questions = await generateQuizWithClaude({
      title: contentItem.title,
      description: contentItem.description,
      learning_objectives: contentItem.learning_objectives,
      difficulty_level: contentItem.difficulty_level,
      config: contentItem.config,
    });

    const response: GeneratedQuiz = {
      questions,
      metadata: {
        total_questions: questions.length,
        difficulty_level: contentItem.difficulty_level || "intermediate",
        estimated_time_minutes: Math.ceil(questions.length * 2),
        content_item_id: itemId,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/content-items/[id]/generate-quiz:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate quiz",
      },
      { status: 500 }
    );
  }
}
