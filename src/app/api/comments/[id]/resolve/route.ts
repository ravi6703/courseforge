import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ResolveCommentRequest {
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

    const body: ResolveCommentRequest = await request.json();
    const { resolutionNote, aiResolved } = body;

    // Get comment
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

    // Update comment as resolved
    const { error: updateError } = await supabase
      .from("comments")
      .update({
        is_resolved: true,
        resolved_by: user.id,
        resolution_note: resolutionNote || null,
        ai_resolved: aiResolved || false,
      })
      .eq("id", commentId);

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        success: true,
        message: "Comment resolved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in comments resolve:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve comment",
      },
      { status: 500 }
    );
  }
}
