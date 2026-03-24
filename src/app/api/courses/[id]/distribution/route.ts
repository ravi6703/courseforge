import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ContentTypeDistribution {
  [key: string]: {
    count: number;
    percentage: number;
    estimated_duration_minutes: number;
  };
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

    // Get all modules for this course
    const { data: modules, error: moduleError } = await supabase
      .from("toc_modules")
      .select("id")
      .eq("course_id", courseId);

    if (moduleError) throw moduleError;

    const moduleIds = modules?.map((m) => m.id) || [];

    if (moduleIds.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    // Get all lessons for these modules
    const { data: lessons, error: lessonError } = await supabase
      .from("toc_lessons")
      .select("id")
      .in("module_id", moduleIds);

    if (lessonError) throw lessonError;

    const lessonIds = lessons?.map((l) => l.id) || [];

    if (lessonIds.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    // Get all content items for these lessons
    const { data: contentItems, error: contentError } = await supabase
      .from("toc_items")
      .select("item_type, duration_minutes")
      .in("lesson_id", lessonIds);

    if (contentError) throw contentError;

    // Calculate distribution
    const distribution: ContentTypeDistribution = {};
    let totalItems = 0;

    if (contentItems && contentItems.length > 0) {
      totalItems = contentItems.length;

      contentItems.forEach((item) => {
        const type = item.item_type || "unknown";
        const duration = item.duration_minutes || 0;

        if (!distribution[type]) {
          distribution[type] = {
            count: 0,
            percentage: 0,
            estimated_duration_minutes: 0,
          };
        }

        distribution[type].count++;
        distribution[type].estimated_duration_minutes += duration;
      });

      // Calculate percentages
      Object.keys(distribution).forEach((type) => {
        distribution[type].percentage = Math.round(
          (distribution[type].count / totalItems) * 100
        );
      });
    }

    return NextResponse.json(distribution, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/courses/[id]/distribution:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get distribution",
      },
      { status: 500 }
    );
  }
}
