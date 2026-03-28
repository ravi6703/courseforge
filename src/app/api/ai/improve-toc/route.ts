import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface ImproveRequest {
  currentTOC: Record<string, unknown>[];
  comments: Array<{
    id: string;
    text: string;
    target_id: string;
    target_type: "module" | "lesson" | "video";
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: ImproveRequest = await req.json();

    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === "your-anthropic-key") {
      // Fallback: return original TOC
      return NextResponse.json({ success: true, modules: body.currentTOC });
    }

    const commentsText = body.comments
      .map(
        (c) =>
          `${c.target_type} (${c.target_id}): "${c.text}"`
      )
      .join("\n");

    const systemPrompt = `You are CourseForge AI — an expert instructional designer. Your task is to improve a course table of contents based on coach feedback while maintaining the Board Infinity format.

When improving the TOC:
1. Address each comment specifically
2. Keep the overall structure consistent
3. Maintain Bloom's Taxonomy alignment
4. Keep realistic durations and content distributions
5. Return valid JSON only

Return the improved modules as JSON in the same structure as the input.`;

    const userPrompt = `Current TOC:
${JSON.stringify(body.currentTOC, null, 2)}

Coach Comments:
${commentsText}

Please improve the TOC addressing each comment above. Return the improved modules as a valid JSON array.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic error:", await response.text());
      return NextResponse.json(
        { success: false, error: "Failed to improve TOC" },
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
    if (parsed.modules && Array.isArray(parsed.modules)) {
      parsed = parsed.modules;
    }

    return NextResponse.json({ success: true, modules: parsed });
  } catch (error) {
    console.error("TOC improvement error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to improve TOC" },
      { status: 500 }
    );
  }
}
