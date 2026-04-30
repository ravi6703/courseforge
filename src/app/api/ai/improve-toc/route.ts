import { NextRequest, NextResponse } from "next/server";
import { aiHeaders, aiMode } from "@/lib/ai/fallback";
import { Module } from "@/types";

interface ImproveTOCRequest {
  courseId: string;
  modules: Module[];
  comments: Array<{
    text: string;
    target_type: string;
    target_id: string;
  }>;
  courseTitle: string;
}

function generateFallbackImprovement(modules: Module[]): Module[] {
  // Return modules with minor text modifications
  return modules.map((module) => ({
    ...module,
    title: `${module.title} (Reviewed)`,
    lessons: module.lessons.map((lesson) => ({
      ...lesson,
      learning_objectives: [
        ...lesson.learning_objectives,
        {
          id: `lo-updated-${Date.now()}`,
          text: "Apply feedback from course review",
          bloom_level: "apply" as const,
        },
      ],
    })),
  }));
}

async function improveWithAI(request: ImproveTOCRequest): Promise<Module[]> {
  const commentsText = request.comments
    .map((c) => `[${c.target_type} ${c.target_id}]: ${c.text}`)
    .join("\n");

  const prompt = `You are a curriculum improvement specialist. The following comments have been made on a course Table of Contents.

Course Title: ${request.courseTitle}

CURRENT TOC (modules only):
${JSON.stringify(
  request.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })),
  })),
  null,
  2
)}

FEEDBACK COMMENTS:
${commentsText}

Please improve the TOC by:
1. Addressing each comment
2. Reordering lessons if suggested
3. Updating learning objectives based on feedback
4. Adding new lessons where needed
5. Maintaining the overall course structure

Return the improved modules as a JSON array matching the Module interface. Include all fields from the original modules but with improvements applied.`;

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
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return generateFallbackImprovement(request.modules);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return generateFallbackImprovement(request.modules);
    }

    const improved = JSON.parse(jsonMatch[0]) as Module[];
    return improved;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return generateFallbackImprovement(request.modules);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImproveTOCRequest;

    const modules = process.env.ANTHROPIC_API_KEY
      ? await improveWithAI(body)
      : generateFallbackImprovement(body.modules);

    return NextResponse.json({ success: true, modules }, { headers: aiHeaders(aiMode()) });
  } catch (error) {
    console.error("Error in /api/ai/improve-toc:", error);
    return NextResponse.json(
      { success: false, error: "Failed to improve TOC" },
      { status: 500, headers: aiHeaders(aiMode()) }
    );
  }
}
