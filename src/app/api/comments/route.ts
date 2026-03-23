import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CreateCommentRequest {
  targetType: string;
  targetId: string;
  body: string;
  slideIndex?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const unresolvedOnly = searchParams.get("unresolved") === "true";

    // Build query
    let query = supabase.from("comments").select("*");

    if (targetType) {
      query = query.eq("target_type", targetType);
    }

    if (targetId) {
      query = query.eq("target_id", targetId);
    }

    if (unresolvedOnly) {
      query = query.eq("is_resolved", false);
    }

    const { data: comments, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json(
      {
        comments: comments || [],
        total: comments?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in comments GET:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch comments",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const body: CreateCommentRequest = await request.json();
    const { targetType, targetId, body: commentBody, slideIndex } = body;

    if (!targetType || !targetId || !commentBody) {
      return NextResponse.json(
        {
          error: "Missing required fields: targetType, targetId, body",
        },
        { status: 400 }
      );
    }

    if (commentBody.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment body cannot be empty" },
        { status: 400 }
      );
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        target_type: targetType,
        target_id: targetId,
        author_id: user.id,
        body: commentBody,
        is_resolved: false,
        slide_index: slideIndex || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in comments POST:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create comment",
      },
      { status: 500 }
    );
  }
}
