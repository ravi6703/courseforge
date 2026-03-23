import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ContentStats {
  [key: string]: number;
}

interface CourseStats {
  totalItems: number;
  completedItems: number;
  inReviewItems: number;
  draftItems: number;
  completionPercent: number;
  moduleCount: number;
  lessonCount: number;
  byType: ContentStats;
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

    // Get modules count
    const { data: modules, error: moduleError } = await supabase
      .from("toc_modules")
      .select("id")
      .eq("course_id", courseId);

    if (moduleError) throw moduleError;

    const moduleCount = modules?.length || 0;

    // Get lessons count through modules
    const moduleIds = modules?.map(m => m.id) || [];
    const { data: lessons, error: lessonError } = await supabase
      .from("toc_lessons")
      .select("id")
      .in("module_id", moduleIds);

    if (lessonError) throw lessonError;

    const lessonCount = lessons?.length || 0;

    // Get content items with status and type breakdown through lessons
    const lessonIds = lessons?.map(l => l.id) || [];
    const { data: contentItems, error: contentError } = await supabase
      .from("toc_items")
      .select("id, status, item_type")
      .in("lesson_id", lessonIds);

    if (contentError) throw contentError;

    const totalItems = contentItems?.length || 0;
    let completedItems = 0;
    let inReviewItems = 0;
    let draftItems = 0;
    const byType: ContentStats = {};

    contentItems?.forEach((item) => {
      // Count by status
      if (item.status === "completed") {
        completedItems++;
      } else if (item.status === "in_review") {
        inReviewItems++;
      } else if (item.status === "draft") {
        draftItems++;
      }

      // Count by type
      if (!byType[item.item_type]) {
        byType[item.item_type] = 0;
      }
      byType[item.item_type]++;
    });

    const completionPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const stats: CourseStats = {
      totalItems,
      completedItems,
      inReviewItems,
      draftItems,
      completionPercent,
      moduleCount,
      lessonCount,
      byType,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("Error in stats:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get course stats",
      },
      { status: 500 }
    );
  }
}
