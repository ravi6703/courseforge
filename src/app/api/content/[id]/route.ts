import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { PatchContentSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getServerSupabase();
  const body = await request.json();

  // Validate request
  const validation = PatchContentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: validation.error.issues },
      { status: 400 }
    );
  }

  const { payload, status } = validation.data;

  try {
    const updateData: any = {};

    if (payload !== undefined) {
      updateData.payload = payload;
    }

    if (status === "approved") {
      updateData.status = status;
      updateData.approved_at = new Date().toISOString();
      // Note: approved_by should be set by RLS policy or trigger
    } else if (status === "draft") {
      updateData.status = status;
      updateData.approved_at = null;
      updateData.approved_by = null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from("content_items")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update content item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 200 });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
