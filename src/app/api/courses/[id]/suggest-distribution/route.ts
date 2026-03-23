import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ContentDistribution {
  [key: string]: {
    ideal: number;
    min: number;
    max: number;
  };
}

interface PlatformDistributions {
  [key: string]: ContentDistribution;
}

const platformDistributions: PlatformDistributions = {
  coursera: {
    video: { ideal: 50, min: 45, max: 60 },
    reading: { ideal: 12, min: 8, max: 15 },
    practice_quiz: { ideal: 8, min: 5, max: 12 },
    graded_quiz: { ideal: 10, min: 8, max: 15 },
    plugin: { ideal: 5, min: 3, max: 8 },
    ai_dialogue: { ideal: 5, min: 3, max: 8 },
    role_play: { ideal: 5, min: 2, max: 8 },
    discussion_prompt: { ideal: 3, min: 2, max: 5 },
    case_study: { ideal: 2, min: 1, max: 4 },
    coding_exercise: { ideal: 0, min: 0, max: 0 },
    glossary: { ideal: 0, min: 0, max: 1 },
  },
  udemy: {
    video: { ideal: 60, min: 55, max: 70 },
    reading: { ideal: 8, min: 5, max: 12 },
    practice_quiz: { ideal: 12, min: 8, max: 15 },
    graded_quiz: { ideal: 8, min: 5, max: 12 },
    plugin: { ideal: 3, min: 1, max: 5 },
    ai_dialogue: { ideal: 0, min: 0, max: 0 },
    role_play: { ideal: 0, min: 0, max: 0 },
    discussion_prompt: { ideal: 2, min: 1, max: 4 },
    case_study: { ideal: 4, min: 2, max: 6 },
    coding_exercise: { ideal: 3, min: 1, max: 5 },
    glossary: { ideal: 0, min: 0, max: 1 },
  },
  university: {
    video: { ideal: 45, min: 40, max: 55 },
    reading: { ideal: 15, min: 10, max: 20 },
    practice_quiz: { ideal: 10, min: 8, max: 15 },
    graded_quiz: { ideal: 12, min: 10, max: 20 },
    plugin: { ideal: 3, min: 2, max: 5 },
    ai_dialogue: { ideal: 0, min: 0, max: 0 },
    role_play: { ideal: 0, min: 0, max: 0 },
    discussion_prompt: { ideal: 5, min: 3, max: 8 },
    case_study: { ideal: 5, min: 3, max: 8 },
    coding_exercise: { ideal: 5, min: 2, max: 8 },
    glossary: { ideal: 0, min: 0, max: 1 },
  },
};

function normalizeDistribution(
  distribution: ContentDistribution,
  enabledTypes: string[]
): ContentDistribution {
  // Filter to only enabled types
  const filtered = Object.entries(distribution).reduce(
    (acc, [key, value]) => {
      if (enabledTypes.includes(key)) {
        acc[key] = value;
      }
      return acc;
    },
    {} as ContentDistribution
  );

  if (Object.keys(filtered).length === 0) {
    return distribution; // Return original if nothing enabled
  }

  // Calculate total of ideal values
  const totalIdeal = Object.values(filtered).reduce(
    (sum, item) => sum + item.ideal,
    0
  );

  if (totalIdeal === 0) {
    return filtered;
  }

  // Normalize to 100%
  const normalized: ContentDistribution = {};
  for (const [key, value] of Object.entries(filtered)) {
    const factor = 100 / totalIdeal;
    normalized[key] = {
      ideal: Math.round(value.ideal * factor),
      min: Math.round(value.min * factor),
      max: Math.round(value.max * factor),
    };
  }

  // Adjust for rounding errors
  const totalIdealNormalized = Object.values(normalized).reduce(
    (sum, item) => sum + item.ideal,
    0
  );
  const diff = 100 - totalIdealNormalized;

  if (diff !== 0) {
    const firstKey = Object.keys(normalized)[0];
    normalized[firstKey].ideal += diff;
  }

  return normalized;
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
      .select("platform, enabled_components")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const platform = courseData.platform.toLowerCase();
    const enabledTypes = courseData.enabled_components ? Object.keys(courseData.enabled_components) : Object.keys(
      platformDistributions[platform] || platformDistributions.udemy
    );

    const baseDistribution =
      platformDistributions[platform] || platformDistributions.udemy;

    const distribution = normalizeDistribution(baseDistribution, enabledTypes);

    return NextResponse.json(
      {
        platform,
        enabledTypes,
        distribution,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in suggest-distribution:", error);
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
