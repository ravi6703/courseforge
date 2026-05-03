import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const db = getServerSupabase();
  const courseId = request.nextUrl.searchParams.get("course_id");

  if (!courseId) {
    return NextResponse.json(
      { error: "course_id query parameter required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await db
      .from("content_items")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch content items" },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data || [] }, { status: 200 });
  } catch (error) {
    console.error("Content list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
