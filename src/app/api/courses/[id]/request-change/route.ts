import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChangeRequest {
  reason: string;
  requesterId: string;
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

    const body: ChangeRequest = await request.json();
    const { reason, requesterId } = body;

    if (!reason || !requesterId) {
      return NextResponse.json(
        { error: "Missing required fields: reason, requesterId" },
        { status: 400 }
      );
    }

    if (reason.length < 20) {
      return NextResponse.json(
        {
          error: "Reason must be at least 20 characters long",
        },
        { status: 400 }
      );
    }

    // Get course details
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Update course status back to 'toc_pm_review'
    const { error: statusError } = await supabase
      .from("courses")
      .update({ status: "toc_pm_review" })
      .eq("id", courseId);

    if (statusError) throw statusError;

    // Create notification for creator
    if (courseData.created_by) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: courseData.created_by,
          type: "toc_change_requested",
          title: "TOC Changes Requested",
          body: `Changes have been requested for "${courseData.title}": ${reason}`,
          related_type: "course",
          related_id: courseId,
          is_read: false,
        });

      if (notifError) throw notifError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Change request submitted successfully",
        newStatus: "toc_pm_review",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in request-change:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to request changes",
      },
      { status: 500 }
    );
  }
}
