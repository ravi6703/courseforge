// Public health-score grade mapping. Shared by the SSR page, the SVG badge,
// and the methodology page so the rule and the colors can never drift.

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface GradeStyle {
  grade: Grade;
  label: string;        // e.g. "Excellent"
  bg: string;           // hex for SVG/badge backgrounds
  fg: string;           // hex for SVG/badge text
  ring: string;         // tailwind class, used on the SSR page
  pill: string;         // tailwind class for the score pill
}

export function gradeForScore(score: number): GradeStyle {
  if (score >= 90) return { grade: "A", label: "Excellent",     bg: "#15803d", fg: "#FFFFFF", ring: "ring-emerald-500",  pill: "bg-emerald-100 text-emerald-800" };
  if (score >= 80) return { grade: "B", label: "Strong",        bg: "#65a30d", fg: "#FFFFFF", ring: "ring-lime-500",     pill: "bg-lime-100 text-lime-800" };
  if (score >= 70) return { grade: "C", label: "Adequate",      bg: "#ca8a04", fg: "#FFFFFF", ring: "ring-amber-500",    pill: "bg-amber-100 text-amber-800" };
  if (score >= 60) return { grade: "D", label: "Needs work",    bg: "#ea580c", fg: "#FFFFFF", ring: "ring-orange-500",   pill: "bg-orange-100 text-orange-800" };
  return                { grade: "F", label: "Below standard", bg: "#b91c1c", fg: "#FFFFFF", ring: "ring-red-500",      pill: "bg-red-100 text-red-800" };
}

// Human-readable rule labels used by both the SSR page and methodology page.
export const RULE_LABELS: Record<string, { title: string; what: string }> = {
  blooms_progression: {
    title: "Bloom's progression",
    what: "Cognitive demand should rise across modules — early lessons remember/understand, later lessons analyze/evaluate/create.",
  },
  time_budget: {
    title: "Time budget",
    what: "The sum of module hours should match the course's stated duration. Drift wastes learner trust.",
  },
  theory_handson_ratio: {
    title: "Theory ↔ hands-on balance",
    what: "Configured theory percentage should match what was actually authored. Imbalance hurts retention and skill transfer.",
  },
  objective_assessment_alignment: {
    title: "Objective ↔ assessment alignment",
    what: "Every learning objective needs at least one question that targets it; every question should map to an objective.",
  },
  redundancy: {
    title: "Lesson redundancy",
    what: "Near-duplicate lesson titles or objectives suggest two lessons cover the same ground. Consolidate or differentiate.",
  },
  capstone: {
    title: "Capstone presence",
    what: "If the course advertises a capstone, the final module must be flagged as the capstone — learners should be able to find it.",
  },
  lesson_length: {
    title: "Lesson length reasonableness",
    what: "Lessons over 90 minutes of video are rarely completed in one sitting. Split or trim.",
  },
};
