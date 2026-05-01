import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // courseId available if needed for auth scoping
  const { table, id, title, description } = await request.json();

  if (!["modules", "lessons"].includes(table) || !id) {
    return NextResponse.json({ error: "Invalid table or id" }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from(table as "modules" | "lessons")
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
