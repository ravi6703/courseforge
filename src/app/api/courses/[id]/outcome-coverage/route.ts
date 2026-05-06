// GET /api/courses/[id]/outcome-coverage
//
// For each course-level learning outcome, computes which lessons cover
// it (heuristic: lesson title or description contains a keyword from
// the outcome) and what Bloom level those lessons reach. Flags:
//   - "uncovered" outcomes (zero matching lessons)
//   - "underbloom" outcomes (lessons exist but don't reach the
//     outcome's Bloom level)

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { BLOOM_LEVELS, type BloomLevel } from "@/types/course-profile";

export const runtime = "nodejs";

// Bloom verb → level
const BLOOM_VERBS: Record<BloomLevel, RegExp> = {
  remember:   /\b(recall|list|name|define|identify|describe)\b/i,
  understand: /\b(explain|summarize|interpret|paraphrase|classify)\b/i,
  apply:      /\b(use|implement|execute|apply|run|build|operate)\b/i,
  analyze:    /\b(compare|diagnose|differentiate|deconstruct|analyze)\b/i,
  evaluate:   /\b(critique|assess|judge|defend|select|evaluate)\b/i,
  create:     /\b(design|build|compose|invent|create|produce)\b/i,
};

const BLOOM_RANK: Record<BloomLevel, number> = {
  remember: 1, understand: 2, apply: 3, analyze: 4, evaluate: 5, create: 6,
};

function detectBloom(text: string): BloomLevel {
  for (const lvl of (Object.keys(BLOOM_VERBS) as BloomLevel[]).reverse()) {
    if (BLOOM_VERBS[lvl].test(text)) return lvl;
  }
  return "understand";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const [{ data: course }, { data: lessons }] = await Promise.all([
    sb.from("courses").select("profile").eq("id", id).maybeSingle(),
    sb.from("lessons").select("id, title, description, learning_objectives, module_id").eq("course_id", id),
  ]);

  const profile = (course?.profile ?? {}) as { outcomes?: { outcomes?: string[]; bloom_cap?: BloomLevel } };
  const outcomes = (profile.outcomes?.outcomes ?? []).filter(Boolean);
  const courseBloomCap: BloomLevel = profile.outcomes?.bloom_cap ?? "apply";

  const ls = (lessons ?? []).map((l) => {
    const text = `${l.title} ${l.description ?? ""} ${JSON.stringify(l.learning_objectives ?? [])}`;
    return { id: l.id, title: l.title, text, bloom: detectBloom(text) };
  });

  const findings = outcomes.map((outcome) => {
    const outcomeBloom = detectBloom(outcome);
    const keywords = outcome
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4)
      .slice(0, 6);
    const hits = ls.filter((l) =>
      keywords.some((k) => l.text.toLowerCase().includes(k))
    );
    const maxBloom = hits.reduce<BloomLevel | null>((acc, l) => {
      if (!acc) return l.bloom;
      return BLOOM_RANK[l.bloom] > BLOOM_RANK[acc] ? l.bloom : acc;
    }, null);
    const status: "ok" | "uncovered" | "underbloom" =
      hits.length === 0
        ? "uncovered"
        : maxBloom && BLOOM_RANK[maxBloom] < BLOOM_RANK[outcomeBloom]
          ? "underbloom"
          : "ok";
    return {
      outcome,
      outcomeBloom,
      coveringLessons: hits.map((h) => ({ id: h.id, title: h.title, bloom: h.bloom })),
      maxLessonBloom: maxBloom,
      status,
    };
  });

  return NextResponse.json({
    courseBloomCap,
    bloomLevels: BLOOM_LEVELS,
    findings,
    summary: {
      total: findings.length,
      uncovered: findings.filter((f) => f.status === "uncovered").length,
      underbloom: findings.filter((f) => f.status === "underbloom").length,
    },
  });
}
