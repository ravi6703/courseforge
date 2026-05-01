import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id: courseId } = await params;
  const { modules } = await request.json();

  const supabase = getServiceSupabase();

  const { data: courseRow } = await supabase
    .from("courses")
    .select("org_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  for (const mod of modules ?? []) {
    const modId = crypto.randomUUID();

    await supabase.from("modules").insert({
      id: modId,
      course_id: courseId,
      title: mod.title,
      description: mod.description || "",
      order: mod.order ?? 0,
      learning_objectives: mod.learning_objectives ?? [],
    });

    for (const lesson of mod.lessons ?? []) {
      const lessonId = crypto.randomUUID();

      await supabase.from("lessons").insert({
        id: lessonId,
        module_id: modId,
        course_id: courseId,
        title: lesson.title,
        description: lesson.description || "",
        order: lesson.order ?? 0,
        learning_objectives: lesson.learning_objectives ?? [],
        content_types: lesson.content_types ?? [],
      });

      for (const video of lesson.videos ?? []) {
        await supabase.from("videos").insert({
          id: crypto.randomUUID(),
          lesson_id: lessonId,
          course_id: courseId,
          title: video.title,
          duration_minutes: video.duration_minutes ?? 10,
          order: video.order ?? 0,
          status: "pending",
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
