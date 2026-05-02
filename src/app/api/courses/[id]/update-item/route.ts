import { NextRequest, NextResponse } from "next/server";
import { UpdateItemSchema, parseBody } from "@/lib/validation/schemas";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id: courseId } = await params;
  let __raw: unknown;
  try { __raw = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const __p = parseBody(UpdateItemSchema, __raw);
  if (!__p.ok) return __p.res;
  const { table, id, title, description } = __p.data;

  if (!["modules", "lessons"].includes(table) || !id) {
    return NextResponse.json({ error: "Invalid table or id" }, { status: 400 });
  }

  const supabase = await getServerSupabase();

  const { data: courseRow } = await supabase
    .from("courses")
    .select("org_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!courseRow || courseRow.org_id !== auth.orgId) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }
  const { error } = await supabase
    .from(table as "modules" | "lessons")
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
