import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getServerSupabase();

  try {
    // Fetch existing content item
    const { data: contentItem, error: fetchError } = await db
      .from("content_items")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !contentItem) {
      return NextResponse.json(
        { error: "Content item not found" },
        { status: 404 }
      );
    }

    // Reset to draft status for regeneration
    const { error: updateError } = await db
      .from("content_items")
      .update({
        status: "draft",
        generation_error: null,
      })
      .eq("id", params.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to reset content item" },
        { status: 500 }
      );
    }

    // Return the content kind so client can trigger generation
    return NextResponse.json(
      { success: true, kind: contentItem.kind, video_id: contentItem.video_id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Regenerate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
