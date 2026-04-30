// src/lib/lint/pedagogy.ts — pedagogy linting (the wedge feature).
//
// What this is, and why it matters:
//
//   Coursebox / Synthesia / LearnWorlds / Heights / Sana / Docebo / 360Learning
//   are all good at *generating* content. None of them check whether the
//   content is pedagogically sound. CourseForge has the structured data
//   (modules → lessons → videos → objectives → assessments → time budgets) to
//   actually grade itself before publish. That's a real moat: it turns the
//   product from "content generator" into "course quality system."
//
// What it checks:
//   1. Bloom's progression — early modules should skew remember/understand,
//      later modules should skew analyze/evaluate/create
//   2. Time budget — sum of module hours should equal duration_weeks * hours_per_week
//   3. Theory/hands-on ratio compliance — actual ratio across videos should
//      match course.theory_handson_ratio within tolerance
//   4. Objective↔assessment alignment — every learning objective should be
//      covered by at least one question; every question should map to an LO
//   5. Redundancy — flag near-duplicate lesson titles or LO texts
//   6. Capstone presence — if course.capstone is true, the last module should
//      have is_capstone=true
//   7. Readability / length — flag lessons whose total minutes wildly exceed
//      the budget for that lesson
//
// Output is a list of findings with severity, target, and a one-line fix
// suggestion. The PM dashboard renders these as a "Course Health" panel.

import type {
  Course,
  Module,
  LearningObjective,
  Question,
  Assessment,
  BloomLevel,
  Video,
} from "@/types";

export type Severity = "critical" | "warning" | "info";

export interface Finding {
  id: string;
  severity: Severity;
  rule: string;
  message: string;
  target_type: "course" | "module" | "lesson" | "objective" | "assessment";
  target_id?: string;
  suggestion?: string;
}

export interface LintInput {
  course: Course;
  modules: Module[];
  assessments?: Assessment[];
  questions?: Question[];
}

export interface LintReport {
  score: number; // 0-100
  findings: Finding[];
  by_severity: Record<Severity, number>;
}

// ─── Bloom's level numeric scale (low cognitive → high) ──────────────────────
const BLOOM_RANK: Record<BloomLevel, number> = {
  remember: 1,
  understand: 2,
  apply: 3,
  analyze: 4,
  evaluate: 5,
  create: 6,
};

// ─── Main entry ──────────────────────────────────────────────────────────────
export function lintCourse({ course, modules, assessments = [], questions = [] }: LintInput): LintReport {
  const findings: Finding[] = [];

  findings.push(...checkBloomProgression(modules));
  findings.push(...checkTimeBudget(course, modules));
  findings.push(...checkTheoryHandsonRatio(course, modules));
  findings.push(...checkObjectiveAssessmentAlignment(modules, assessments, questions));
  findings.push(...checkRedundancy(modules));
  findings.push(...checkCapstone(course, modules));
  findings.push(...checkLessonLengthReasonableness(modules));

  const by_severity: Record<Severity, number> = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  // Score: start at 100, subtract penalties.
  const score = Math.max(
    0,
    100 - by_severity.critical * 15 - by_severity.warning * 5 - by_severity.info * 1
  );

  return { score, findings, by_severity };
}

// ─── Rule 1: Bloom's progression ─────────────────────────────────────────────
function checkBloomProgression(modules: Module[]): Finding[] {
  if (modules.length < 3) return [];
  const out: Finding[] = [];

  const moduleMeans = modules.map((m) => {
    const all: BloomLevel[] = [];
    m.learning_objectives?.forEach((lo) => all.push(lo.bloom_level));
    m.lessons?.forEach((l) =>
      l.learning_objectives?.forEach((lo) => all.push(lo.bloom_level))
    );
    if (all.length === 0) return 0;
    return all.reduce((s, b) => s + BLOOM_RANK[b], 0) / all.length;
  });

  // First third should average ≤ 3, last third should average ≥ 3
  const third = Math.floor(modules.length / 3);
  const firstAvg =
    moduleMeans.slice(0, third).reduce((s, n) => s + n, 0) / Math.max(1, third);
  const lastAvg =
    moduleMeans.slice(-third).reduce((s, n) => s + n, 0) / Math.max(1, third);

  if (firstAvg > 3.5) {
    out.push({
      id: "bloom-front-loaded",
      severity: "warning",
      rule: "blooms_progression",
      target_type: "course",
      message: `Early modules average Bloom rank ${firstAvg.toFixed(1)} — too cognitively demanding for the start of a course.`,
      suggestion:
        "Soften the first third with remember/understand objectives before introducing apply/analyze.",
    });
  }
  if (lastAvg < 3) {
    out.push({
      id: "bloom-flat-finish",
      severity: "warning",
      rule: "blooms_progression",
      target_type: "course",
      message: `Final modules average Bloom rank ${lastAvg.toFixed(1)} — the course never asks learners to analyze, evaluate, or create.`,
      suggestion:
        "Add at least one analyze/evaluate/create objective in the last third (or capstone).",
    });
  }

  // Inversions: each module should not be far below the previous
  for (let i = 1; i < moduleMeans.length; i++) {
    if (moduleMeans[i - 1] - moduleMeans[i] > 1.5) {
      out.push({
        id: `bloom-inversion-${i}`,
        severity: "info",
        rule: "blooms_progression",
        target_type: "module",
        target_id: modules[i].id,
        message: `Module ${i + 1} cognitive level drops sharply from module ${i}.`,
        suggestion: "Either reorder, or surface why this module deliberately revisits foundational content.",
      });
    }
  }

  return out;
}

// ─── Rule 2: Time budget ─────────────────────────────────────────────────────
function checkTimeBudget(course: Course, modules: Module[]): Finding[] {
  const expected = (course.duration_weeks || 0) * (course.hours_per_week || 0);
  const actual = modules.reduce((s, m) => s + (m.duration_hours || 0), 0);
  if (expected === 0) return [];
  const drift = Math.abs(actual - expected);
  if (drift / expected > 0.2) {
    return [
      {
        id: "time-budget",
        severity: drift / expected > 0.4 ? "critical" : "warning",
        rule: "time_budget",
        target_type: "course",
        message: `Module hours sum to ${actual}h but course budget is ${expected}h (${course.duration_weeks}w × ${course.hours_per_week}h).`,
        suggestion:
          actual < expected
            ? "Add lessons or extend module durations."
            : "Trim modules — learners will overrun.",
      },
    ];
  }
  return [];
}

// ─── Rule 3: Theory/hands-on ratio ───────────────────────────────────────────
function checkTheoryHandsonRatio(course: Course, modules: Module[]): Finding[] {
  const videos: Video[] = [];
  modules.forEach((m) => m.lessons?.forEach((l) => videos.push(...(l.videos || []))));
  if (videos.length === 0) return [];
  const handsOn = videos.filter((v) => v.is_handson).length;
  const actualTheoryPct = Math.round(((videos.length - handsOn) / videos.length) * 100);
  const target = course.theory_handson_ratio ?? 70;
  if (Math.abs(actualTheoryPct - target) > 15) {
    return [
      {
        id: "theory-handson",
        severity: "warning",
        rule: "theory_handson_ratio",
        target_type: "course",
        message: `Configured for ${target}% theory but actual is ${actualTheoryPct}%.`,
        suggestion:
          actualTheoryPct > target
            ? "Mark more videos is_handson=true or add lab/code-along videos."
            : "Convert some hands-on videos to theory or remove a lab.",
      },
    ];
  }
  return [];
}

// ─── Rule 4: Objective ↔ assessment alignment ────────────────────────────────
function checkObjectiveAssessmentAlignment(
  modules: Module[],
  _assessments: Assessment[],
  questions: Question[]
): Finding[] {
  const out: Finding[] = [];
  const allObjectives: LearningObjective[] = [];
  modules.forEach((m) => {
    allObjectives.push(...(m.learning_objectives || []));
    m.lessons?.forEach((l) => allObjectives.push(...(l.learning_objectives || [])));
  });
  if (allObjectives.length === 0) return out;

  const coveredObjectiveIds = new Set(
    questions.map((q) => q.learning_objective_id).filter(Boolean) as string[]
  );

  const uncovered = allObjectives.filter((lo) => !coveredObjectiveIds.has(lo.id));
  if (uncovered.length > 0) {
    out.push({
      id: "objectives-uncovered",
      severity: uncovered.length > allObjectives.length / 3 ? "critical" : "warning",
      rule: "objective_assessment_alignment",
      target_type: "course",
      message: `${uncovered.length} of ${allObjectives.length} learning objectives have no assessment question targeting them.`,
      suggestion:
        "Generate assessment questions per learning objective or remove objectives that aren't assessable.",
    });
  }

  // Orphan questions
  const objectiveIds = new Set(allObjectives.map((lo) => lo.id));
  const orphans = questions.filter(
    (q) => q.learning_objective_id && !objectiveIds.has(q.learning_objective_id)
  );
  if (orphans.length > 0) {
    out.push({
      id: "questions-orphaned",
      severity: "info",
      rule: "objective_assessment_alignment",
      target_type: "course",
      message: `${orphans.length} questions reference learning objectives that no longer exist.`,
      suggestion: "Re-link or delete the orphan questions.",
    });
  }

  return out;
}

// ─── Rule 5: Redundancy ──────────────────────────────────────────────────────
function checkRedundancy(modules: Module[]): Finding[] {
  const out: Finding[] = [];
  const titles: string[] = [];
  modules.forEach((m) => m.lessons?.forEach((l) => titles.push(l.title)));
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      if (similar(titles[i], titles[j])) {
        out.push({
          id: `redundant-${i}-${j}`,
          severity: "info",
          rule: "redundancy",
          target_type: "lesson",
          message: `Lessons "${titles[i]}" and "${titles[j]}" appear redundant.`,
          suggestion: "Merge or differentiate the second lesson.",
        });
      }
    }
  }
  return out.slice(0, 5); // cap noise
}

// ─── Rule 6: Capstone presence ───────────────────────────────────────────────
function checkCapstone(course: Course, modules: Module[]): Finding[] {
  if (!course.capstone) return [];
  const last = modules[modules.length - 1];
  if (!last?.is_capstone) {
    return [
      {
        id: "capstone-missing",
        severity: "critical",
        rule: "capstone",
        target_type: "course",
        message:
          "Capstone is enabled at course level but no module is flagged is_capstone.",
        suggestion: "Mark the final module as the capstone, or disable the toggle.",
      },
    ];
  }
  return [];
}

// ─── Rule 7: Lesson length reasonableness ────────────────────────────────────
function checkLessonLengthReasonableness(modules: Module[]): Finding[] {
  const out: Finding[] = [];
  modules.forEach((m) => {
    m.lessons?.forEach((l) => {
      const totalMin = (l.videos || []).reduce(
        (s, v) => s + (v.duration_minutes || 0),
        0
      );
      if (totalMin > 90) {
        out.push({
          id: `lesson-too-long-${l.id}`,
          severity: "warning",
          rule: "lesson_length",
          target_type: "lesson",
          target_id: l.id,
          message: `Lesson "${l.title}" totals ${totalMin} minutes of video — most learners will not complete a single sitting over 60–75 minutes.`,
          suggestion: "Split this lesson into two, or trim the longest videos.",
        });
      }
    });
  });
  return out;
}

// ─── String similarity (Jaccard over tokens) ─────────────────────────────────
function similar(a: string, b: string): boolean {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return false;
  let inter = 0;
  ta.forEach((w) => {
    if (tb.has(w)) inter++;
  });
  const union = ta.size + tb.size - inter;
  return inter / union > 0.7;
}
