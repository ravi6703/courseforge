import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ContentItem {
  id: string;
  title: string;
  item_type: string;
  status: string;
  duration_minutes: number;
  description?: string;
  learning_objectives?: string[];
  sort_order: number;
}

interface Lesson {
  id: string;
  name: string;
  learning_objectives?: string[];
  total_length_minutes: number;
  content_items: ContentItem[];
}

interface Module {
  id: string;
  name: string;
  description?: string;
  learning_objectives?: string[];
  total_length_hours: number;
  lessons: Lesson[];
}

interface CourseDetail {
  id: string;
  title: string;
  domain: string;
  platform: string;
  course_level: string;
  target_audience: string;
  status: string;
  learning_objectives?: string[];
  total_length_hours?: number;
  modules: Module[];
}

export async function GET(
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

    // Get course
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

    // Get modules with lessons and content items
    const { data: modulesData, error: moduleError } = await supabase
      .from("toc_modules")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });

    if (moduleError) throw moduleError;

    const modules: Module[] = [];

    if (modulesData && modulesData.length > 0) {
      for (const moduleData of modulesData) {
        // Get lessons for this module
        const { data: lessonsData, error: lessonError } = await supabase
          .from("toc_lessons")
          .select("*")
          .eq("module_id", moduleData.id)
          .order("sort_order", { ascending: true });

        if (lessonError) throw lessonError;

        const lessons: Lesson[] = [];

        if (lessonsData && lessonsData.length > 0) {
          for (const lesson of lessonsData) {
            // Get content items for this lesson
            const { data: itemsData, error: itemError } = await supabase
              .from("toc_items")
              .select("*")
              .eq("lesson_id", lesson.id)
              .order("sort_order", { ascending: true });

            if (itemError) throw itemError;

            const contentItems: ContentItem[] = (itemsData || []).map((item) => ({
              id: item.id,
              title: item.title,
              item_type: item.item_type,
              status: item.status,
              duration_minutes: item.duration_minutes || 0,
              description: item.description,
              learning_objectives: item.learning_objectives,
              sort_order: item.sort_order,
            }));

            lessons.push({
              id: lesson.id,
              name: lesson.name,
              learning_objectives: lesson.learning_objectives,
              total_length_minutes: lesson.total_length_minutes || 0,
              content_items: contentItems,
            });
          }
        }

        modules.push({
          id: moduleData.id,
          name: moduleData.name,
          description: moduleData.description,
          learning_objectives: moduleData.learning_objectives,
          total_length_hours: moduleData.total_length_hours || 0,
          lessons,
        });
      }
    }

    const response: CourseDetail = {
      id: courseData.id,
      title: courseData.title,
      domain: courseData.domain,
      platform: courseData.platform,
      course_level: courseData.course_level,
      target_audience: courseData.target_audience,
      status: courseData.status,
      learning_objectives: courseData.learning_objectives,
      total_length_hours: courseData.total_length_hours,
      modules,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/courses/[id]:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch course",
      },
      { status: 500 }
    );
  }
}
