import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { GenerateContentItemSchema } from "@/lib/validation/schemas";
import {
  buildPQPrompt,
  buildGQPrompt,
  buildReadingPrompt,
  buildAICoachPrompt,
  buildScormPrompt,
} from "@/lib/ai/prompts/content";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  PQPayloadSchema,
  GQPayloadSchema,
  ReadingPayloadSchema,
  AICoachPayloadSchema,
  ScormPayloadSchema,
} from "@/lib/validation/schemas";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const db = getServerSupabase();
  const body = await request.json();

  // Validate request
  const validation = GenerateContentItemSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: validation.error.issues },
      { status: 400 }
    );
  }

  const { video_id, kind } = validation.data;

  try {
    // Fetch video with transcript, lesson, module, course
    const { data: video, error: videoError } = await db
      .from("videos")
      .select(
        `
        id, title, duration_minutes,
        lesson:lessons(id, title, 
          moduleInfo:modules(id, title,
            course:courses(id, title)
          )
        )
      `
      )
      .eq("id", video_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Get transcript
    const { data: transcriptData, error: transcriptError } = await db
      .from("transcriptions")
      .select("text")
      .eq("video_id", video_id)
      .single();

    if (transcriptError || !transcriptData?.text) {
      return NextResponse.json(
        { error: "No transcript available for this video" },
        { status: 400 }
      );
    }

    const transcript = transcriptData.text;
    const videoTitle = video.title;
    const lessonTitle = video.lesson?.title || "Lesson";
    const moduleTitle = video.lesson?.moduleInfo?.title || "Module";
    const courseTitle = video.lesson?.moduleInfo?.course?.title || "Course";

    // Build prompt based on content kind
    let prompt: { system: string; user: string };
    let schema;

    switch (kind) {
      case "pq":
        prompt = buildPQPrompt(videoTitle, transcript, lessonTitle, moduleTitle, courseTitle);
        schema = PQPayloadSchema;
        break;
      case "gq":
        prompt = buildGQPrompt(videoTitle, transcript, lessonTitle, moduleTitle, courseTitle);
        schema = GQPayloadSchema;
        break;
      case "reading":
        prompt = buildReadingPrompt(videoTitle, transcript, lessonTitle, moduleTitle, courseTitle);
        schema = ReadingPayloadSchema;
        break;
      case "ai_coach":
        prompt = buildAICoachPrompt(videoTitle, transcript, lessonTitle, moduleTitle, courseTitle);
        schema = AICoachPayloadSchema;
        break;
      case "scorm":
        prompt = buildScormPrompt(videoTitle, transcript, lessonTitle, moduleTitle, courseTitle);
        schema = ScormPayloadSchema;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid content kind" },
          { status: 400 }
        );
    }

    // Call Claude API
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: prompt.user,
        },
      ],
    });

    // Extract JSON from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse Claude response" },
        { status: 500 }
      );
    }

    const payload = JSON.parse(jsonMatch[0]);

    // Validate payload against schema
    const payloadValidation = schema.safeParse(payload);
    if (!payloadValidation.success) {
      return NextResponse.json(
        { error: "Invalid generated content", issues: payloadValidation.error.issues },
        { status: 400 }
      );
    }

    // Upsert to database
    const { error: upsertError } = await db
      .from("content_items")
      .upsert(
        {
          video_id,
          kind,
          payload: payloadValidation.data,
          status: "draft",
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: "video_id,kind",
        }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to save content item" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, payload: payloadValidation.data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
