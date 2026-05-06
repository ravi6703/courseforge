// Timeline / Gantt math.
//
// Given a course with N videos and a target completion date or target_days,
// generate a per-video step plan:
//   brief → slides → record → transcript → assets → review → publish
//
// Days are allocated proportionally to the total target. Steps are
// dependent in order; `depends_on` links the previous step.

export type TimelineStepKind =
  | "profile"
  | "toc"
  | "brief"
  | "slides"
  | "record"
  | "transcript"
  | "assets"
  | "review"
  | "publish";

/** Default day weights per step. The sum is normalized to target_days. */
const DEFAULT_WEIGHTS: Record<TimelineStepKind, number> = {
  profile: 0.5,
  toc: 0.5,
  brief: 1,
  slides: 2,
  record: 1,
  transcript: 0.5,
  assets: 1.5,
  review: 0.5,
  publish: 0.5,
};

const PER_LESSON_STEPS: TimelineStepKind[] = [
  "brief", "slides", "record", "transcript", "assets",
];

const COURSE_LEVEL_STEPS: TimelineStepKind[] = ["profile", "toc", "review", "publish"];

export interface PlannedStep {
  kind: TimelineStepKind;
  /** When step is per-lesson, lesson_id is set; otherwise null (course-wide). */
  lessonId: string | null;
  videoId: string | null;
  moduleId: string | null;
  scheduledStart: string; // ISO yyyy-mm-dd
  scheduledEnd: string;
  daysAllocated: number;
  order: number;
}

export interface PlanInput {
  startDate: Date;
  /** Total days the user has to ship the course. */
  totalDays: number;
  modules: Array<{
    id: string;
    lessons: Array<{
      id: string;
      videos: Array<{ id: string }>;
    }>;
  }>;
}

/**
 * Plan a complete project timeline by walking the canonical order:
 * profile / toc → for each lesson (in order) [brief → slides → record →
 * transcript → assets] → review → publish.
 *
 * Days are scaled so the final scheduledEnd lands on totalDays.
 */
export function planTimeline(input: PlanInput): {
  steps: PlannedStep[];
  endDate: Date;
} {
  const allLessons = input.modules.flatMap((m) =>
    m.lessons.map((l) => ({ moduleId: m.id, lessonId: l.id }))
  );

  // 1. Compute raw weights
  const totalWeight =
    DEFAULT_WEIGHTS.profile +
    DEFAULT_WEIGHTS.toc +
    DEFAULT_WEIGHTS.review +
    DEFAULT_WEIGHTS.publish +
    allLessons.length *
      PER_LESSON_STEPS.reduce((sum, k) => sum + DEFAULT_WEIGHTS[k], 0);

  // 2. Each weight unit = (totalDays / totalWeight) days
  const dayPerUnit = Math.max(0.25, input.totalDays / totalWeight);

  const steps: PlannedStep[] = [];
  let cursor = new Date(input.startDate);
  let order = 0;

  const pushStep = (kind: TimelineStepKind, ctx: { lessonId: string | null; videoId: string | null; moduleId: string | null }) => {
    const days = DEFAULT_WEIGHTS[kind] * dayPerUnit;
    const start = new Date(cursor);
    cursor = addDays(cursor, days);
    const end = new Date(cursor);
    steps.push({
      kind,
      lessonId: ctx.lessonId,
      videoId: ctx.videoId,
      moduleId: ctx.moduleId,
      scheduledStart: toISO(start),
      scheduledEnd: toISO(end),
      daysAllocated: round2(days),
      order: order++,
    });
  };

  // Course-level: profile, toc
  pushStep("profile", { lessonId: null, videoId: null, moduleId: null });
  pushStep("toc",     { lessonId: null, videoId: null, moduleId: null });

  // Per lesson (in order)
  for (const l of allLessons) {
    for (const k of PER_LESSON_STEPS) {
      pushStep(k, { lessonId: l.lessonId, videoId: null, moduleId: l.moduleId });
    }
  }

  // Course-level wrap-up
  pushStep("review",  { lessonId: null, videoId: null, moduleId: null });
  pushStep("publish", { lessonId: null, videoId: null, moduleId: null });

  return { steps, endDate: cursor };
}

export function isStepSlipping(step: { scheduledEnd: string; status: string; actualEnd: string | null }): boolean {
  if (step.status === "done") return false;
  const due = new Date(step.scheduledEnd).getTime();
  return Date.now() > due && step.status !== "done";
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────
function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setTime(next.getTime() + days * 86_400_000);
  return next;
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const STEP_LABELS: Record<TimelineStepKind, string> = {
  profile: "Profile",
  toc: "TOC",
  brief: "Brief",
  slides: "Slides",
  record: "Record",
  transcript: "Transcript",
  assets: "Assets",
  review: "Review",
  publish: "Publish",
};

export const STEP_COLORS: Record<TimelineStepKind, string> = {
  profile: "#94a3b8",       // slate-400
  toc: "#64748b",           // slate-500
  brief: "#0ea5e9",         // sky-500
  slides: "#3b82f6",        // blue-500
  record: "#8b5cf6",        // violet-500
  transcript: "#a855f7",    // purple-500
  assets: "#10b981",        // emerald-500
  review: "#f59e0b",        // amber-500
  publish: "#22c55e",       // green-500
};
