import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ClaudeMessage {
  content: Array<{
    type: string;
    text: string;
  }>;
}

interface TOCModule {
  moduleNumber: number;
  name: string;
  description: string;
  lengthHours: number;
  learningObjectives: string[];
  employabilityAngle: string;
  lessons: TOCLesson[];
}

interface TOCLesson {
  lessonNumber: number;
  name: string;
  lengthMinutes: number;
  learningObjectives: string[];
  items: ContentItem[];
}

interface ContentItem {
  type: string;
  title: string;
  description: string;
  lengthMinutes: number;
  orderIndex: number;
}

interface CourseData {
  title: string;
  domain: string;
  level: string;
  platform: string;
  target_audience: string;
  course_length_hours: number;
  hands_on_percent: number;
  video_length_minutes: number;
}

async function generateTOCWithClaude(courseData: CourseData): Promise<TOCModule[]> {
  const moduleCount = Math.max(4, Math.ceil(courseData.course_length_hours / 4.5));

  const prompt = `You are an expert course designer. Generate a comprehensive Table of Contents (TOC) for the following course:

Title: ${courseData.title}
Domain: ${courseData.domain}
Level: ${courseData.level}
Platform: ${courseData.platform}
Target Audience: ${courseData.target_audience}
Course Length: ${courseData.course_length_hours} hours
Hands-on Percentage: ${courseData.hands_on_percent}%
Total Video Length: ${courseData.video_length_minutes} minutes

Requirements:
1. Create exactly ${moduleCount} modules
2. Each module should have 3 lessons
3. Each lesson should have 3 videos
4. Learning objectives should follow Bloom's Taxonomy:
   - Course level: 5-7 objectives
   - Module level: 3-4 objectives per module
   - Lesson level: 2 objectives per lesson
5. Include an employability/career angle for each module
6. Platform-specific content:
   - AI Dialogue and Role Play are ONLY for Coursera platform
   - Other platforms should not include these
7. Each module should approximately ${(courseData.course_length_hours / moduleCount).toFixed(2)} hours

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "modules": [
    {
      "moduleNumber": 1,
      "name": "Module name",
      "description": "Module description",
      "lengthHours": 1.5,
      "learningObjectives": ["objective1", "objective2", "objective3"],
      "employabilityAngle": "How this relates to career",
      "lessons": [
        {
          "lessonNumber": 1,
          "name": "Lesson name",
          "lengthMinutes": 30,
          "learningObjectives": ["objective1", "objective2"]
        }
      ]
    }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
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
      throw new Error("Failed to generate TOC with Claude");
    }

    const data = (await response.json()) as ClaudeMessage;
    const textContent = data.content.find((c) => c.type === "text");

    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const parsedResponse = JSON.parse(textContent.text);
    return parsedResponse.modules;
  } catch (error) {
    console.error("Error generating TOC with Claude:", error);
    throw error;
  }
}

function generateFallbackTOC(courseData: CourseData): TOCModule[] {
  const moduleCount = Math.max(4, Math.ceil(courseData.course_length_hours / 4.5));
  const hoursPerModule = courseData.course_length_hours / moduleCount;
  const minutesPerLesson = (hoursPerModule * 60) / 3;

  const modules: TOCModule[] = [];

  for (let i = 1; i <= moduleCount; i++) {
    const lessons: TOCLesson[] = [];

    for (let j = 1; j <= 3; j++) {
      const items: ContentItem[] = [];
      let orderIndex = 0;

      // Add Reading to every lesson
      items.push({
        type: "reading",
        title: `Reading ${j}`,
        description: `Key reading materials for lesson ${j}`,
        lengthMinutes: 15,
        orderIndex: orderIndex++,
      });

      // Add 3 videos per lesson
      for (let v = 1; v <= 3; v++) {
        items.push({
          type: "video",
          title: `Video ${v}`,
          description: `Video content for lesson ${j}, part ${v}`,
          lengthMinutes: Math.ceil(minutesPerLesson / 3),
          orderIndex: orderIndex++,
        });
      }

      // Add Plugin in Lesson 2 only
      if (j === 2) {
        items.push({
          type: "plugin",
          title: "Interactive Plugin",
          description: "Interactive learning tool",
          lengthMinutes: 20,
          orderIndex: orderIndex++,
        });
      }

      // Add AI Dialogue in Lesson 2 for Coursera only
      if (j === 2 && courseData.platform === "coursera") {
        items.push({
          type: "ai_dialogue",
          title: "AI Dialogue",
          description: "Dialogue with AI assistant",
          lengthMinutes: 15,
          orderIndex: orderIndex++,
        });
      }

      // Add Role Play in Lesson 3 for Coursera only
      if (j === 3 && courseData.platform === "coursera") {
        items.push({
          type: "role_play",
          title: "Role Play Scenario",
          description: "Practice role play scenario",
          lengthMinutes: 20,
          orderIndex: orderIndex++,
        });
      }

      // Add Coding Exercise in Lesson 3 if hands_on > 30%
      if (j === 3 && courseData.hands_on_percent > 30) {
        items.push({
          type: "coding_exercise",
          title: "Coding Exercise",
          description: "Hands-on coding practice",
          lengthMinutes: 30,
          orderIndex: orderIndex++,
        });
      }

      // Add Practice Quiz to every lesson
      items.push({
        type: "practice_quiz",
        title: "Practice Quiz",
        description: "Self-assessment quiz",
        lengthMinutes: 10,
        orderIndex: orderIndex++,
      });

      lessons.push({
        lessonNumber: j,
        name: `Lesson ${j}`,
        lengthMinutes: Math.ceil(minutesPerLesson),
        learningObjectives: [
          `Understand key concepts from lesson ${j}`,
          `Apply knowledge from lesson ${j}`,
        ],
        items,
      });
    }

    modules.push({
      moduleNumber: i,
      name: `Module ${i}`,
      description: `Core content module ${i}`,
      lengthHours: hoursPerModule,
      learningObjectives: [
        `Master module ${i} core concepts`,
        `Apply module ${i} knowledge`,
        `Evaluate module ${i} scenarios`,
      ],
      employabilityAngle: `Apply module ${i} skills in professional settings`,
      lessons,
    });
  }

  return modules;
}

async function createTOCInDatabase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  modules: TOCModule[]
) {
  try {
    // Create modules and lessons
    for (const tocModule of modules) {
      // Create module
      const { data: moduleData, error: moduleError } = await supabase
        .from("toc_modules")
        .insert({
          course_id: courseId,
          sort_order: tocModule.moduleNumber,
          name: tocModule.name,
          description: tocModule.description,
          total_length_hours: tocModule.lengthHours,
          learning_objectives: tocModule.learningObjectives,
        })
        .select()
        .single();

      if (moduleError) throw moduleError;

      const moduleId = moduleData.id;

      // Create lessons and content items
      for (const lesson of tocModule.lessons) {
        const { data: lessonData, error: lessonError } = await supabase
          .from("toc_lessons")
          .insert({
            module_id: moduleId,
            sort_order: lesson.lessonNumber,
            name: lesson.name,
            total_length_minutes: lesson.lengthMinutes,
            learning_objectives: lesson.learningObjectives,
          })
          .select()
          .single();

        if (lessonError) throw lessonError;

        const lessonId = lessonData.id;

        // Create content items for this lesson
        const contentItems = lesson.items.map((item) => ({
          lesson_id: lessonId,
          item_type: item.type,
          title: item.title,
          sort_order: item.orderIndex,
          duration_minutes: item.lengthMinutes,
          status: "planned",
          theory_hands_ratio: null,
          screen_sharing_needed: false,
          num_questions: 0,
          difficulty_level: null,
          passing_threshold: null,
          config: {},
        }));

        const { error: contentError } = await supabase
          .from("toc_items")
          .insert(contentItems);

        if (contentError) throw contentError;
      }
    }

    // Update course status to 'toc_generated'
    const { error: statusError } = await supabase
      .from("courses")
      .update({ status: "toc_generated" })
      .eq("id", courseId);

    if (statusError) throw statusError;

    return { success: true };
  } catch (error) {
    console.error("Error creating TOC in database:", error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const courseId = params.id;

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

    // Get course details
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Generate TOC using Claude, fallback to template
    let modules: TOCModule[];
    try {
      modules = await generateTOCWithClaude(courseData);
    } catch {
      console.warn("Claude generation failed, using fallback template");
      modules = generateFallbackTOC(courseData);
    }

    // Create TOC in database
    await createTOCInDatabase(supabase, courseId, modules);

    return NextResponse.json(
      {
        success: true,
        message: "TOC generated successfully",
        moduleCount: modules.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in generate-toc:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate TOC",
      },
      { status: 500 }
    );
  }
}
