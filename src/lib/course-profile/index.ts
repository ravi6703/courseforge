// Course Profile helpers — the read/write boundary between the DB column
// (courses.profile jsonb) and every consumer.
//
// getProfile / updateProfile are the only callers that should know the
// raw jsonb shape. Everywhere else (prompt builders, settings UI, lint
// passes) imports from here and gets a fully-typed CourseProfile.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CourseProfile, DEFAULT_PROFILE,
  TONE_PRESETS, type ToneId,
} from "@/types/course-profile";

export { DEFAULT_PROFILE, TONE_PRESETS };
export type { CourseProfile, ToneId };

/**
 * Deep-merge stored partial profile onto DEFAULT_PROFILE so callers always
 * get a fully-populated object even for legacy courses created before the
 * profile column existed.
 */
function mergeProfile(stored: unknown): CourseProfile {
  const s = (stored && typeof stored === "object") ? stored as Record<string, unknown> : {};
  const sub = <K extends keyof CourseProfile>(k: K): Partial<CourseProfile[K]> => {
    const v = s[k as string];
    return (v && typeof v === "object") ? v as Partial<CourseProfile[K]> : {};
  };
  return {
    audience:       { ...DEFAULT_PROFILE.audience,       ...sub("audience") },
    tone:           { ...DEFAULT_PROFILE.tone,           ...sub("tone") },
    pedagogy:       { ...DEFAULT_PROFILE.pedagogy,       ...sub("pedagogy") },
    vocabulary:     { ...DEFAULT_PROFILE.vocabulary,     ...sub("vocabulary") },
    brand:          { ...DEFAULT_PROFILE.brand,          ...sub("brand") },
    reading_list:   (s.reading_list as CourseProfile["reading_list"] | undefined) ?? DEFAULT_PROFILE.reading_list,
    difficulty_arc: (s.difficulty_arc as CourseProfile["difficulty_arc"] | undefined) ?? DEFAULT_PROFILE.difficulty_arc,
  };
}

export async function getProfile(sb: SupabaseClient, courseId: string): Promise<CourseProfile | null> {
  const { data, error } = await sb
    .from("courses")
    .select("profile")
    .eq("id", courseId)
    .maybeSingle();
  if (error || !data) return null;
  return mergeProfile(data.profile);
}

export async function updateProfile(sb: SupabaseClient, courseId: string, profile: CourseProfile) {
  const { data, error } = await sb
    .from("courses")
    .update({ profile })
    .eq("id", courseId)
    .select("id, profile_updated_at")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, profile_updated_at: data.profile_updated_at };
}

/**
 * Build a system-prompt fragment from the profile that's safe to inject
 * into any AI call. Idempotent — safe to embed even when fields are
 * empty (renders a minimal fragment).
 *
 * The fragment is in <course_profile>...</course_profile> tags so prompts
 * can reference it explicitly ("Apply tone from <course_profile>") and
 * downstream caching keyed on profile_updated_at can dedupe.
 */
export function buildPromptFragment(profile: CourseProfile): string {
  const tone = TONE_PRESETS.find((t) => t.id === profile.tone.primary);
  const must  = profile.vocabulary.must_include.filter(Boolean);
  const ban   = profile.vocabulary.banned.filter(Boolean);
  const reads = profile.reading_list.filter((r) => r.url);
  const lines: string[] = [];

  lines.push("<course_profile>");

  if (profile.audience.primary_persona) {
    lines.push(`Audience: ${profile.audience.primary_persona} (${profile.audience.level}).`);
    if (profile.audience.secondary_personas.length > 0) {
      lines.push(`Secondary: ${profile.audience.secondary_personas.join("; ")}.`);
    }
  }

  if (tone) {
    lines.push(`Tone: ${tone.label} — ${tone.what}`);
  }
  if (profile.tone.locale) {
    lines.push(`Locale: ${profile.tone.locale}.`);
  }

  lines.push(`Pedagogy: ${profile.pedagogy.preset.replace("_", " ")}, ${profile.pedagogy.theory_handson_ratio}% theory / ${100 - profile.pedagogy.theory_handson_ratio}% hands-on.`);
  lines.push(`Difficulty arc: ${profile.difficulty_arc.replace(/_/g, " ")}.`);

  if (must.length > 0) lines.push(`Must-include vocabulary: ${must.join(", ")}.`);
  if (ban.length  > 0) lines.push(`Avoid these terms: ${ban.join(", ")}.`);

  if (reads.length > 0) {
    lines.push(`Reference reading (cite where relevant):`);
    reads.slice(0, 5).forEach((r) => lines.push(`  - ${r.title} — ${r.url}${r.why ? ` (${r.why})` : ""}`));
  }

  lines.push("</course_profile>");
  return lines.join("\n");
}

/** Compact one-line summary, used in UI tooltips and audit logs. */
export function summarizeProfile(profile: CourseProfile): string {
  const tone = TONE_PRESETS.find((t) => t.id === profile.tone.primary)?.label ?? profile.tone.primary;
  const audience = profile.audience.primary_persona || "audience unset";
  return `${tone} · ${audience} · ${profile.pedagogy.theory_handson_ratio}% theory`;
}
