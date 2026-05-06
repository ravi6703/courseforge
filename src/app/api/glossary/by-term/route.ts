// GET /api/glossary/by-term?course=<id>&term=<term>
//
// Resolves a (course, term) pair to its glossary_entries.id. Used by
// the AutoGlossary client to promote a term without listing all rows.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");
  const term = searchParams.get("term");
  if (!course || !term) return NextResponse.json({ error: "course + term required" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data } = await sb
    .from("glossary_entries")
    .select("id")
    .eq("course_id", course)
    .eq("term", term)
    .maybeSingle();
  return NextResponse.json({ id: data?.id ?? null });
}
