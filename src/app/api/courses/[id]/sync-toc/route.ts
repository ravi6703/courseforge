import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// PERF-1: collapse the original N+1 (await insert per module → lesson → video,
// 30+ round-trips for a 4×3×2 TOC) into 3 bulk inserts. SEC-2: switch to
// session-bound client so RLS does the org_id check.

interface IncomingVideo {
  title: string;
  duration_minutes?: number;
  order?: number;
}
interface IncomingLesson {
  title: string;
  description?: string;
  order?: number;
  learning_objectives?: unknown;
  content_types?: string[];
  videos?: IncomingVideo[];
}
interface IncomingModule {
  title: string;
  description?: string;
  order?: number;
  learning_objectives?: unknown;
  lessons?: IncomingLesson[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id: courseId } = await params;
  const { modules } = (await request.json()) as { modules: IncomingModule[] };

  const supabase = await getServerSupabase();

  // Ownership check is now both at the app level and via RLS, but we keep the
  // explicit query so the 404 message is informative and the route fails fast
  // before doing any writes.
  const { data: courseRow } = await supabase
    .from("courses")
    .select("org_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  // Build all rows up-front so we can do exactly 3 inserts.
  const moduleRows: Array<Record<string, unknown>> = [];
  const lessonRows: Array<Record<string, unknown>> = [];
  const videoRows: Array<Record<string, unknown>> = [];

  for (const mod of modules ?? []) {
    const modId = crypto.randomUUID();
    moduleRows.push({
      id: modId,
      org_id: auth.orgId,
      course_id: courseId,
      title: mod.title,
      description: mod.description || "",
      order: mod.order ?? 0,
      learning_objectives: mod.learning_objectives ?? [],
    });

    for (const lesson of mod.lessons ?? []) {
      const lessonId = crypto.randomUUID();
      lessonRows.push({
        id: lessonId,
        org_id: auth.orgId,
        course_id: courseId,
        module_id: modId,
        title: lesson.title,
        description: lesson.description || "",
        order: lesson.order ?? 0,
        learning_objectives: lesson.learning_objectives ?? [],
        content_types: lesson.content_types ?? [],
      });

      for (const video of lesson.videos ?? []) {
        videoRows.push({
          id: crypto.randomUUID(),
          org_id: auth.orgId,
          course_id: courseId,
          lesson_id: lessonId,
          title: video.title,
          duration_minutes: video.duration_minutes ?? 10,
          order: video.order ?? 0,
          status: "pending",
        });
      }
    }
  }

  // 3 bulk inserts in dependency order (modules → lessons → videos).
  if (moduleRows.length) {
    const { error } = await supabase.from("modules").insert(moduleRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (lessonRows.length) {
    const { error } = await supabase.from("lessons").insert(lessonRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (videoRows.length) {
    const { error } = await supabase.from("videos").insert(videoRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    counts: { modules: moduleRows.length, lessons: lessonRows.length, videos: videoRows.length },
  });
}
