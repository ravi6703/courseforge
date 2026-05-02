import { describe, it, expect } from "vitest";
import { lintCourse } from "@/lib/lint/pedagogy";
import type { Course, Module, Question, Assessment, BloomLevel } from "@/types";

const baseCourse = (overrides: Partial<Course> = {}): Course => ({
  id: "c1",
  org_id: "org1",
  title: "Test Course",
  description: "x",
  platform: "infylearn",
  status: "draft",
  audience_level: "intermediate",
  duration_weeks: 4,
  hours_per_week: 5,
  target_job_roles: [],
  theory_handson_ratio: 70,
  project_based: false,
  capstone: false,
  content_types: [],
  module_hours: {},
  toc_locked: false,
  created_at: "",
  updated_at: "",
  ...overrides,
});

const lo = (text: string, bloom: BloomLevel) => ({ id: `lo-${text}`, text, bloom_level: bloom });

const mkModule = (
  i: number,
  bloom: BloomLevel,
  hours: number,
  lessons: Array<{ title: string; videoMinutes: number[]; isHandson?: boolean[] }> = []
): Module => ({
  id: `m${i}`,
  org_id: "org1",
  course_id: "c1",
  title: `Module ${i}`,
  description: "",
  duration_hours: hours,
  order: i,
  is_capstone: false,
  is_project_milestone: false,
  learning_objectives: [lo(`m${i}-lo`, bloom)],
  lessons: lessons.map((l, j) => ({
    id: `m${i}-l${j}`,
    org_id: "org1",
    module_id: `m${i}`,
    course_id: "c1",
    title: l.title,
    description: "",
    order: j,
    learning_objectives: [lo(`l${j}`, bloom)],
    content_types: [],
    videos: l.videoMinutes.map((min, k) => ({
      id: `v${i}-${j}-${k}`,
      org_id: "org1",
      course_id: "c1",
      lesson_id: `m${i}-l${j}`,
      title: `Video ${k}`,
      duration_minutes: min,
      order: k,
      is_handson: l.isHandson?.[k] ?? false,
      status: "pending" as const,
    })),
  })),
});

describe("pedagogy.lintCourse", () => {
  it("returns score 100 with no findings when objectives are covered by questions", () => {
    // Bloom progression rule needs >= 3 modules to engage; below that it stays silent.
    // Objective-coverage rule needs at least one question per module objective.
    const course = baseCourse({ duration_weeks: 1, hours_per_week: 2 });
    const modules = [mkModule(1, "understand", 1), mkModule(2, "apply", 1)];
    const allLOs = modules.flatMap((m) => m.learning_objectives);
    const questions: Question[] = allLOs.map((lo, i) => ({
      id: `q${i}`, org_id: "org1", course_id: "c1", assessment_id: "a1",
      prompt: "what?", kind: "mcq_single", options: [], correct_answers: [], weight: 1, order: i,
      learning_objective_id: lo.id,
    }));
    const r = lintCourse({ course, modules, questions });
    expect(r.findings).toEqual([]);
    expect(r.score).toBe(100);
  });

  it("flags time budget drift > 20%", () => {
    const course = baseCourse({ duration_weeks: 4, hours_per_week: 5 }); // 20h budget
    const modules = [mkModule(1, "understand", 5)]; // only 5h actual, 75% under
    const r = lintCourse({ course, modules });
    const f = r.findings.find((x) => x.rule === "time_budget");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("warns when first third is too cognitively demanding", () => {
    const course = baseCourse({ duration_weeks: 12, hours_per_week: 5 });
    const modules = [
      mkModule(1, "create", 20),
      mkModule(2, "create", 20),
      mkModule(3, "create", 20),
    ];
    const r = lintCourse({ course, modules });
    expect(r.findings.find((f) => f.id === "bloom-front-loaded")).toBeDefined();
  });

  it("flags missing capstone when course.capstone is true", () => {
    const course = baseCourse({ capstone: true, duration_weeks: 2, hours_per_week: 5 });
    const modules = [mkModule(1, "understand", 5), mkModule(2, "apply", 5)];
    const r = lintCourse({ course, modules });
    const f = r.findings.find((x) => x.rule === "capstone");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
  });

  it("flags lessons over 90 minutes of video", () => {
    const course = baseCourse({ duration_weeks: 1, hours_per_week: 2 });
    const modules = [
      mkModule(1, "understand", 2, [
        { title: "Marathon", videoMinutes: [50, 50] },  // 100m total
      ]),
    ];
    const r = lintCourse({ course, modules });
    expect(r.findings.find((f) => f.rule === "lesson_length")).toBeDefined();
  });

  it("flags theory/hands-on ratio drift > 15%", () => {
    const course = baseCourse({ theory_handson_ratio: 70, duration_weeks: 1, hours_per_week: 2 });
    const modules = [
      mkModule(1, "understand", 2, [
        { title: "L", videoMinutes: [10, 10, 10, 10], isHandson: [true, true, true, true] }, // 0% theory
      ]),
    ];
    const r = lintCourse({ course, modules });
    expect(r.findings.find((f) => f.rule === "theory_handson_ratio")).toBeDefined();
  });

  it("flags uncovered learning objectives when assessments present but mismatched", () => {
    const course = baseCourse({ duration_weeks: 1, hours_per_week: 1 });
    const modules = [mkModule(1, "understand", 1)];
    const assessments: Assessment[] = [];
    const questions: Question[] = [
      {
        id: "q1", org_id: "org1", course_id: "c1", assessment_id: "a1",
        prompt: "What?", kind: "mcq_single", options: [], correct_answers: [], weight: 1, order: 0,
        learning_objective_id: "wrong-lo",
      },
    ];
    const r = lintCourse({ course, modules, assessments, questions });
    expect(r.findings.some((f) => f.id === "objectives-uncovered")).toBe(true);
    expect(r.findings.some((f) => f.id === "questions-orphaned")).toBe(true);
  });

  it("score deducts 15 per critical, 5 per warning, 1 per info", () => {
    const course = baseCourse({ capstone: true, duration_weeks: 2, hours_per_week: 5, theory_handson_ratio: 70 });
    const modules = [
      mkModule(1, "understand", 1, [{ title: "L", videoMinutes: [60, 60] }]),
      mkModule(2, "apply", 1),
    ];
    const r = lintCourse({ course, modules });
    // critical: capstone, time_budget; warning: lesson_length
    const expected = 100 - r.by_severity.critical * 15 - r.by_severity.warning * 5 - r.by_severity.info * 1;
    expect(r.score).toBe(Math.max(0, expected));
  });
});
