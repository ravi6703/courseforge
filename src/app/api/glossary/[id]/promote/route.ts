// POST /api/glossary/[id]/promote
//
// Promote a glossary entry into the course profile's vocabulary.must_include
// so future AI generations keep using the term consistently.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProfile, updateProfile } from "@/lib/course-profile";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const { data: entry } = await sb
    .from("glossary_entries")
    .select("course_id, term")
    .eq("id", id)
    .maybeSingle();
  if (!entry) return NextResponse.json({ error: "glossary entry not found" }, { status: 404 });

  const profile = await getProfile(sb, entry.course_id);
  if (!profile) return NextResponse.json({ error: "course not found" }, { status: 404 });

  const set = new Set(profile.vocabulary.must_include);
  set.add(entry.term);
  const next = { ...profile, vocabulary: { ...profile.vocabulary, must_include: Array.from(set) } };

  const result = await updateProfile(sb, entry.course_id, next);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  await sb.from("glossary_entries").update({ promoted_to_profile: true }).eq("id", id);

  return NextResponse.json({ ok: true });
}
