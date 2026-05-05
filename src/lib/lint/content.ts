// Content-artifact lint engine.
//
// One function per content kind. Each returns a `Finding[]` keyed on rule_id.
// The same rules are used by:
//   - GET /api/lint/content?content_item_id=…  (suggestions rail)
//   - GET /api/audit/[courseId]                 (final review)
//
// Rules are intentionally cheap heuristics — no AI calls. The "Apply fix"
// button on the suggestions rail then sends the rule's `fix_prompt` through
// the AI Edit endpoint, which is where the actual rewrite happens.

import { readability } from "@/lib/format/readability";

export type Severity = "critical" | "major" | "minor";

export interface Finding {
  rule_id: string;
  severity: Severity;
  message: string;
  fix_prompt: string;
  details?: Record<string, unknown>;
}

interface PQQuestion {
  type?: string; stem?: string; options?: string[]; correct?: string;
  explanation?: string; difficulty?: string; bloom?: string;
}
interface GQQuestion extends PQQuestion {
  points?: number; rubric_text?: string;
}
interface ReadingItem {
  title?: string; summary?: string; url?: string;
  why_it_matters?: string; reading_time_min?: number;
}

// ── PQ ──────────────────────────────────────────────────────────────────────
export function lintPQ(payload: Record<string, unknown> | null): Finding[] {
  const out: Finding[] = [];
  const qs = ((payload?.questions as PQQuestion[]) ?? []);
  if (qs.length === 0) {
    out.push({ rule_id: "no_questions", severity: "critical",
      message: "Practice quiz has no questions.",
      fix_prompt: "Add 5 practice questions covering the main concepts of this video. Mix MCQ and short-answer." });
    return out;
  }
  if (qs.length < 5) {
    out.push({ rule_id: "too_few_questions", severity: "major",
      message: `Only ${qs.length} practice questions; aim for at least 5.`,
      fix_prompt: `Add ${5 - qs.length} more practice questions covering ideas not yet tested.` });
  }
  const missingExpl = qs.filter((q) => !q.explanation || q.explanation.length < 10);
  if (missingExpl.length) {
    out.push({ rule_id: "missing_explanations", severity: "major",
      message: `${missingExpl.length} question(s) lack a learner-facing explanation.`,
      fix_prompt: "For every question whose explanation is empty or shorter than one sentence, write a 1–2 sentence explanation that justifies the correct answer and addresses the most likely wrong answer." });
  }
  const blooms = new Set(qs.map((q) => q.bloom).filter(Boolean));
  if (blooms.size <= 1 && qs.length >= 5) {
    out.push({ rule_id: "bloom_diversity", severity: "minor",
      message: "All questions are at the same Bloom level — consider mixing recall, apply, analyze.",
      fix_prompt: "Rewrite at least 2 of these questions so they target a different Bloom level (apply or analyze) than the rest." });
  }
  return out;
}

// ── GQ ──────────────────────────────────────────────────────────────────────
export function lintGQ(payload: Record<string, unknown> | null): Finding[] {
  const out: Finding[] = [];
  const qs = ((payload?.questions as GQQuestion[]) ?? []);
  if (qs.length === 0) {
    out.push({ rule_id: "no_questions", severity: "critical",
      message: "Graded assessment has no questions.",
      fix_prompt: "Add 3–5 graded questions worth a total of 100 points covering the lesson outcomes." });
    return out;
  }
  const totalPts = qs.reduce((s, q) => s + (q.points ?? 0), 0);
  if (totalPts === 0) {
    out.push({ rule_id: "weight_missing", severity: "critical",
      message: "No question carries weight — total is 0 points.",
      fix_prompt: "Assign points to every question so the totals sum to 100. Heavier questions for analyze/evaluate, lighter for recall." });
  } else if (totalPts !== 100) {
    out.push({ rule_id: "weight_imbalance", severity: "major",
      message: `Question weights total ${totalPts} (should be 100).`,
      fix_prompt: `Rebalance the points so every question still measures the same outcome but the total is exactly 100. Currently ${totalPts}.` });
  }
  const missingRubric = qs.filter((q) => !q.rubric_text || q.rubric_text.length < 10);
  if (missingRubric.length) {
    out.push({ rule_id: "missing_rubric", severity: "major",
      message: `${missingRubric.length} graded question(s) lack a rubric.`,
      fix_prompt: "Add a 1–2 sentence rubric to every graded question so a grader can score consistently." });
  }
  return out;
}

// ── Reading ─────────────────────────────────────────────────────────────────
export function lintReading(payload: Record<string, unknown> | null): Finding[] {
  const out: Finding[] = [];
  const items = ((payload?.items as ReadingItem[]) ?? []);
  if (items.length === 0) {
    out.push({ rule_id: "no_items", severity: "critical",
      message: "Reading list is empty.",
      fix_prompt: "Curate 3–5 reading items: each with a title, summary, why-it-matters and reading-time estimate." });
    return out;
  }
  if (items.length < 3) {
    out.push({ rule_id: "too_few_items", severity: "major",
      message: `Only ${items.length} reading item(s); aim for at least 3.`,
      fix_prompt: `Add ${3 - items.length} more reading items that round out the topic. Prefer different perspectives and a mix of short/long reads.` });
  }
  const noWhy = items.filter((i) => !i.why_it_matters || i.why_it_matters.length < 10);
  if (noWhy.length) {
    out.push({ rule_id: "missing_why", severity: "minor",
      message: `${noWhy.length} reading item(s) lack a learner-facing rationale.`,
      fix_prompt: "For every reading item whose 'why_it_matters' is empty or shorter than one sentence, write a one-line reason that ties the resource to the lesson outcome." });
  }
  const summaries = items.map((i) => i.summary ?? "").join(" ");
  const r = readability(summaries);
  if (r.fleschKincaid > 14) {
    out.push({ rule_id: "reading_level_drift", severity: "minor",
      message: `Summary reading level is grade ${r.fleschKincaid.toFixed(1)} — may be too dense for the audience.`,
      fix_prompt: "Rewrite each item's summary in shorter sentences so the average reading level falls below grade 12." });
  }
  return out;
}

// ── AI Coach ────────────────────────────────────────────────────────────────
export function lintAICoach(payload: Record<string, unknown> | null): Finding[] {
  const out: Finding[] = [];
  const sys = (payload?.system as string) ?? "";
  if (sys.length < 200) {
    out.push({ rule_id: "thin_system_prompt", severity: "major",
      message: "AI Coach system prompt is shorter than 200 characters.",
      fix_prompt: "Expand the system prompt to at least 400 characters. Include role, tone, scope (what topics to engage with), and explicit refusals (what to redirect)." });
  }
  if (!/refus|redirect|out of scope|cannot help/i.test(sys)) {
    out.push({ rule_id: "no_refusal_clause", severity: "minor",
      message: "System prompt has no refusal/scoping clause.",
      fix_prompt: "Add a paragraph at the end of the system prompt instructing the coach to redirect off-topic questions back to the lesson, or politely refuse." });
  }
  return out;
}

// ── Discussion ──────────────────────────────────────────────────────────────
export function lintDiscussion(payload: Record<string, unknown> | null): Finding[] {
  const out: Finding[] = [];
  const prompt = (payload?.prompt as string) ?? "";
  if (!prompt) {
    out.push({ rule_id: "no_prompt", severity: "critical",
      message: "Discussion has no prompt.",
      fix_prompt: "Write an open-ended discussion prompt tied to the video's main learning objective. Aim for 2–3 sentences." });
  }
  if (prompt && !prompt.includes("?")) {
    out.push({ rule_id: "not_a_question", severity: "minor",
      message: "Prompt doesn't end in a question — learners reply more thoughtfully when explicitly invited.",
      fix_prompt: "Rewrite the prompt so it ends with an open question (avoid yes/no questions)." });
  }
  return out;
}

// ── Worked Example ──────────────────────────────────────────────────────────
export function lintWorkedExample(payload: Record<string, unknown> | null): Finding[] {
  const out: Finding[] = [];
  const steps = ((payload?.steps as Array<{ reasoning?: string }>) ?? []);
  if (steps.length < 3) {
    out.push({ rule_id: "too_few_steps", severity: "major",
      message: `Only ${steps.length} step(s); aim for at least 3 for a worked example.`,
      fix_prompt: "Expand the worked example to at least 4 steps. Each step should be its own micro-decision with a one-line reasoning." });
  }
  const noReasoning = steps.filter((s) => !s.reasoning || s.reasoning.length < 10);
  if (noReasoning.length && steps.length > 0) {
    out.push({ rule_id: "missing_reasoning", severity: "minor",
      message: `${noReasoning.length} step(s) lack reasoning — learners learn the WHY from this column.`,
      fix_prompt: "For every step missing reasoning, add one sentence explaining why that step is the right move." });
  }
  return out;
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
export function lintByKind(kind: string, payload: Record<string, unknown> | null): Finding[] {
  switch (kind) {
    case "pq":             return lintPQ(payload);
    case "gq":             return lintGQ(payload);
    case "reading":        return lintReading(payload);
    case "ai_coach":       return lintAICoach(payload);
    case "discussion":     return lintDiscussion(payload);
    case "worked_example": return lintWorkedExample(payload);
    default:               return [];
  }
}

export function scoreFindings(findings: Finding[]): { score: number; critical: number; major: number; minor: number } {
  let critical = 0, major = 0, minor = 0;
  for (const f of findings) {
    if (f.severity === "critical") critical++;
    else if (f.severity === "major") major++;
    else minor++;
  }
  // Same shape as the existing lint score: starts at 100, deducts.
  const score = Math.max(0, 100 - critical * 25 - major * 8 - minor * 3);
  return { score, critical, major, minor };
}
