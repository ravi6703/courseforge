// Assessment composer — replaces the previous 3-field bar with a real spec.
//
// Lives in /course/[id]/content workspace next to the GQ / PQ Generate
// button. The coach configures these dimensions ONCE per video, then
// "Generate" pipes them through the AI route. Per-video overrides are
// stored on the content_items.payload alongside the generated questions.

import type { BloomLevel } from "@/types";

export type StemStyle = "concept_first" | "scenario_first" | "case_based";
export type Mode      = "untimed" | "timed" | "proctored";

export interface BloomMix {
  remember: number;    // 0-100, must sum to ~100 across all 6
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

export interface AssessmentComposerSpec {
  /** Step 1 — coverage. Object IDs of LOs the assessment must cover.
   *  When empty the AI is told to cover every objective from the
   *  lesson's `learning_objectives`. */
  covered_objective_ids: string[];

  /** Step 2 — Bloom mix. Sums approximately to 100. Drives question
   *  type as a side-effect (e.g. apply→scenario MCQ, analyze→short
   *  answer or peer-assessed). */
  bloom_mix: BloomMix;

  /** Step 3 — stem style. Concept-first asks definitional questions,
   *  scenario-first opens with a workplace situation, case-based
   *  carries one case across multiple linked questions. */
  stem_style: StemStyle;

  /** Step 4 — distractor quality. "Misconceptions" forces the AI to
   *  pull plausible wrong answers from common pitfalls; "varied" mixes
   *  in random plausible distractors; "near_miss" makes them all very
   *  close to correct (hardest band). */
  distractor_target: "misconceptions" | "varied" | "near_miss";

  /** Step 5 — time / mode. Total budget in minutes; mode is enforcement. */
  total_minutes: number;
  mode: Mode;

  /** Carry-overs from the legacy 3-field bar so we don't break callers
   *  that already saved them on the course settings. */
  difficulty: "beginner" | "intermediate" | "advanced";
  count: number;
  question_kinds: Array<"mcq_single" | "mcq_multi" | "true_false" | "short_answer" | "case_chain">;

  /** Generate 2× the count and shuffle, vs a fixed list. */
  bank_oversample: boolean;
}

export const DEFAULT_BLOOM_MIX: BloomMix = {
  remember: 10, understand: 30, apply: 40, analyze: 15, evaluate: 5, create: 0,
};

export const DEFAULT_COMPOSER: AssessmentComposerSpec = {
  covered_objective_ids: [],
  bloom_mix: DEFAULT_BLOOM_MIX,
  stem_style: "scenario_first",
  distractor_target: "misconceptions",
  total_minutes: 15,
  mode: "untimed",
  difficulty: "intermediate",
  count: 5,
  question_kinds: ["mcq_single", "true_false"],
  bank_oversample: false,
};

export const BLOOM_LEVELS: BloomLevel[] = ["remember","understand","apply","analyze","evaluate","create"];

export function bloomMixSum(m: BloomMix): number {
  return BLOOM_LEVELS.reduce((s, k) => s + (m[k] ?? 0), 0);
}

export function normalizeBloomMix(m: BloomMix): BloomMix {
  const sum = bloomMixSum(m) || 1;
  return {
    remember:   Math.round((m.remember   / sum) * 100),
    understand: Math.round((m.understand / sum) * 100),
    apply:      Math.round((m.apply      / sum) * 100),
    analyze:    Math.round((m.analyze    / sum) * 100),
    evaluate:   Math.round((m.evaluate   / sum) * 100),
    create:     Math.round((m.create     / sum) * 100),
  };
}
