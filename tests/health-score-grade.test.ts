import { describe, it, expect } from "vitest";
import { gradeForScore, RULE_LABELS } from "@/lib/health-score/grade";

describe("gradeForScore — letter grade boundaries", () => {
  it("90+ → A (excellent / emerald)", () => {
    expect(gradeForScore(100).grade).toBe("A");
    expect(gradeForScore(90).grade).toBe("A");
    expect(gradeForScore(95).label).toBe("Excellent");
  });

  it("80..89 → B (lime)", () => {
    expect(gradeForScore(89).grade).toBe("B");
    expect(gradeForScore(80).grade).toBe("B");
  });

  it("70..79 → C (amber)", () => {
    expect(gradeForScore(79).grade).toBe("C");
    expect(gradeForScore(70).grade).toBe("C");
  });

  it("60..69 → D (orange)", () => {
    expect(gradeForScore(69).grade).toBe("D");
    expect(gradeForScore(60).grade).toBe("D");
  });

  it("<60 → F (red)", () => {
    expect(gradeForScore(59).grade).toBe("F");
    expect(gradeForScore(0).grade).toBe("F");
  });

  it("returns hex backgrounds the SVG badge can paint with", () => {
    expect(gradeForScore(95).bg).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(gradeForScore(0).bg).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("RULE_LABELS — covers all 7 lint dimensions", () => {
  const required = [
    "blooms_progression",
    "time_budget",
    "theory_handson_ratio",
    "objective_assessment_alignment",
    "redundancy",
    "capstone",
    "lesson_length",
  ];
  it.each(required)("has a label and what for %s", (rule) => {
    expect(RULE_LABELS[rule]).toBeDefined();
    expect(RULE_LABELS[rule].title.length).toBeGreaterThan(0);
    expect(RULE_LABELS[rule].what.length).toBeGreaterThan(20);
  });
});
