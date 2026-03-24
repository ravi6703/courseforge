import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface UpdateCommentRequest {
  is_resolved?: boolean;
  resolutionNote?: string;
  aiResolved?: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const commentId = params.id;

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

    const body: UpdateCommentRequest = await request.json();
    const { is_resolved, resolutionNote, aiResolved } = body;

    // Get comment to verify it exists
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("*")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (is_resolved !== undefined) {
      updateData.is_resolved = is_resolved;

      // If resolving, add resolution metadata
      if (is_resolved) {
        updateData.resolved_by = user.id;
        if (resolutionNote !== undefined) {
          updateData.resolution_note = resolutionNote;
        }
        if (aiResolved !== undefined) {
          updateData.ai_resolved = aiResolved;
        }
      }
    }

    // Update the comment
    const { error: updateError } = await supabase
      .from("comments")
      .update(updateData)
      .eq("id", commentId);

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        success: true,
        message: "Comment updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PATCH /api/comments/[id]:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update comment",
      },
      { status: 500 }
    );
  }
}
