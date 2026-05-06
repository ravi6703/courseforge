// GET /api/profile-templates — list templates available to the user.
// POST /api/profile-templates — save the current course's profile as a template.

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_PROFILE } from "@/types/course-profile";

export const runtime = "nodejs";

export async function GET() {
  const sb = await getServerSupabase();
  const { data } = await sb
    .from("profile_templates")
    .select("id, name, description, profile, health_score, uses_count, is_global, created_at")
    .order("uses_count", { ascending: false })
    .limit(50);

  // Always include a few seed starters so first-time orgs aren't empty.
  const seeds = SEED_TEMPLATES.map((t, i) => ({
    id: `seed-${i}`,
    name: t.name,
    description: t.description,
    profile: t.profile,
    health_score: null,
    uses_count: 0,
    is_global: true,
    created_at: null,
  }));

  return NextResponse.json({ templates: [...(data ?? []), ...seeds] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, description, profile, source_course_id } = body as {
    name: string; description?: string; profile: unknown; source_course_id?: string;
  };
  if (!name || !profile) return NextResponse.json({ error: "name + profile required" }, { status: 400 });

  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from("profile_templates")
    .insert({ name, description, profile, source_course_id })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

const SEED_TEMPLATES: Array<{ name: string; description: string; profile: typeof DEFAULT_PROFILE }> = [
  {
    name: "Developer bootcamp · hands-on",
    description: "Mid-career engineer audience, 30/70 theory/hands-on, project-led, conversational tone.",
    profile: {
      ...DEFAULT_PROFILE,
      audience: { primary_persona: "Mid-career backend developer, 3-7 years, comfortable shipping prod code", level: "intermediate", secondary_personas: [] },
      tone: { primary: "conversational", locale: "en-US" },
      pedagogy: { preset: "project_led", theory_handson_ratio: 30 },
      difficulty_arc: "beginner_to_intermediate",
    },
  },
  {
    name: "Executive overview · concise",
    description: "C-suite audience, 80/20 theory/hands-on, lecture-led, professional tone.",
    profile: {
      ...DEFAULT_PROFILE,
      audience: { primary_persona: "VP / C-suite at a mid-market SaaS company, evaluating a technology decision", level: "advanced", secondary_personas: [] },
      tone: { primary: "professional", locale: "en-US" },
      pedagogy: { preset: "lecture_led", theory_handson_ratio: 80 },
      difficulty_arc: "mixed",
    },
  },
  {
    name: "Beginner-friendly · storytelling",
    description: "Total beginners, 50/50 theory/hands-on, case-based, storytelling tone.",
    profile: {
      ...DEFAULT_PROFILE,
      audience: { primary_persona: "Career-changer with no prior experience in the field", level: "beginner", secondary_personas: [] },
      tone: { primary: "storytelling", locale: "en-US" },
      pedagogy: { preset: "case_based", theory_handson_ratio: 50 },
      difficulty_arc: "beginner_only",
    },
  },
  {
    name: "Cohort certification · rigorous",
    description: "Working professionals, 40/60 theory/hands-on, project-led, educational tone, mastery arc.",
    profile: {
      ...DEFAULT_PROFILE,
      audience: { primary_persona: "Working professional pursuing a 12-week certificate while keeping a full-time job", level: "intermediate", secondary_personas: [] },
      tone: { primary: "educational", locale: "en-US" },
      pedagogy: { preset: "project_led", theory_handson_ratio: 40 },
      difficulty_arc: "advanced",
      monetization: { tier: "premium", price_usd: 499 },
    },
  },
];
