import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ApprovalRequest {
  stage: "pm_review" | "coach_review";
  reviewerId: string;
  comments?: string;
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

    const body: ApprovalRequest = await request.json();
    const { stage, reviewerId, comments } = body;

    if (!stage || !reviewerId) {
      return NextResponse.json(
        { error: "Missing required fields: stage, reviewerId" },
        { status: 400 }
      );
    }

    if (!["pm_review", "coach_review"].includes(stage)) {
      return NextResponse.json(
        { error: "Invalid stage. Must be pm_review or coach_review" },
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

    // Create approval record
    const { error: approvalError } = await supabase
      .from("approvals")
      .insert({
        course_id: courseId,
        stage,
        status: "approved",
        reviewer_id: reviewerId,
        comments: comments || null,
      });

    if (approvalError) throw approvalError;

    if (stage === "pm_review") {
      // Update course status to 'toc_pm_approved'
      const { error: statusError } = await supabase
        .from("courses")
        .update({ status: "toc_pm_approved" })
        .eq("id", courseId);

      if (statusError) throw statusError;

      // Get all coaches to notify them
      const { data: coaches, error: coachError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "coach");

      if (coachError) throw coachError;

      // Create notifications for all coaches
      if (coaches && coaches.length > 0) {
        const notifications = coaches.map((coach) => ({
          user_id: coach.id,
          type: "toc_review_ready",
          title: "TOC Ready for Review",
          body: `The TOC for "${courseData.title}" is ready for your review.`,
          related_type: "course",
          related_id: courseId,
          is_read: false,
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifError) throw notifError;
      }
    } else if (stage === "coach_review") {
      // Update course status to 'toc_locked'
      const { error: statusError } = await supabase
        .from("courses")
        .update({ status: "toc_locked" })
        .eq("id", courseId);

      if (statusError) throw statusError;

      // Notify creator of coach approval
      if (courseData.created_by) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: courseData.created_by,
            type: "toc_approved",
            title: "TOC Approved",
            body: `The TOC for "${courseData.title}" has been approved by the coach.`,
            related_type: "course",
            related_id: courseId,
            is_read: false,
          });

        if (notifError) throw notifError;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `TOC ${stage} approval recorded successfully`,
        newStatus:
          stage === "pm_review" ? "toc_pm_approved" : "toc_locked",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in approve-toc:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve TOC",
      },
      { status: 500 }
    );
  }
}
