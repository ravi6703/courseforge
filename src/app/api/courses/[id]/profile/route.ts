// GET / PATCH /api/courses/[id]/profile

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase, requireUser } from "@/lib/supabase/server";
import { getProfile, updateProfile } from "@/lib/course-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ProfileSchema = z.object({
  audience: z.object({
    primary_persona: z.string().max(500),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    secondary_personas: z.array(z.string().max(300)).max(5),
  }),
  tone: z.object({
    primary: z.enum(["concise","detailed","professional","educational","conversational","storytelling"]),
    locale: z.string().max(20),
  }),
  pedagogy: z.object({
    preset: z.enum(["bloom_strict","project_led","lecture_led","case_based"]),
    theory_handson_ratio: z.number().int().min(0).max(100),
  }),
  vocabulary: z.object({
    must_include: z.array(z.string().max(80)).max(50),
    banned:       z.array(z.string().max(80)).max(50),
  }),
  brand: z.object({
    logo_url:        z.string().url().max(500).optional().or(z.literal("")),
    primary_color:   z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent_color:    z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal("")),
    typography:      z.string().max(80),
    slide_template:  z.enum(["minimal","editorial","vibrant","academic"]).optional(),
  }),
  reading_list: z.array(z.object({
    title: z.string().min(1).max(200),
    url:   z.string().url().max(500),
    why:   z.string().max(300),
  })).max(20),
  difficulty_arc: z.enum(["beginner_only","beginner_to_intermediate","mixed","advanced"]),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const sb = await getServerSupabase();
  const profile = await getProfile(sb, params.id);
  if (!profile) return NextResponse.json({ error: "course not found" }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "pm") {
    return NextResponse.json({ error: "PM role required to edit course profile" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parse = ProfileSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid profile", issues: parse.error.issues }, { status: 400 });
  }
  const sb = await getServerSupabase();
  const result = await updateProfile(sb, params.id, parse.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, profile_updated_at: result.profile_updated_at });
}
