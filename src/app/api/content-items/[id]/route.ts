import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface UpdateContentItemRequest {
  status?: string;
  content?: string;
  title?: string;
  description?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const itemId = params.id;

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

    const body: UpdateContentItemRequest = await request.json();
    const { status, content, title, description } = body;

    // Validate that at least one field is being updated
    if (!status && !content && !title && !description) {
      return NextResponse.json(
        {
          error: "At least one field must be provided: status, content, title, or description",
        },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    // Content is stored in metadata or config for now
    if (content !== undefined) {
      // Get current item to preserve metadata
      const { data: currentItem, error: fetchError } = await supabase
        .from("toc_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (fetchError || !currentItem) {
        return NextResponse.json(
          { error: "Content item not found" },
          { status: 404 }
        );
      }

      // Update config with content
      const config = currentItem.config || {};
      config.content = content;
      updateData.config = config;
    }

    // Update the content item
    const { data: updatedItem, error: updateError } = await supabase
      .from("toc_items")
      .update(updateData)
      .eq("id", itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!updatedItem) {
      return NextResponse.json(
        { error: "Failed to update content item" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        item: updatedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PATCH /api/content-items/[id]:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update content item",
      },
      { status: 500 }
    );
  }
}
