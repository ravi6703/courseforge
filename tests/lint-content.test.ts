// Smoke tests for src/lib/lint/content.ts — the per-artifact lint engine
// the suggestions rail and audit endpoint both depend on.

import { describe, it, expect } from "vitest";
import {
  lintPQ, lintGQ, lintReading, lintAICoach, lintDiscussion,
  lintWorkedExample, lintByKind, scoreFindings,
} from "@/lib/lint/content";

describe("lintPQ", () => {
  it("flags an empty payload as critical", () => {
    const f = lintPQ(null);
    expect(f.find((x) => x.rule_id === "no_questions")?.severity).toBe("critical");
  });
  it("flags too-few questions", () => {
    const f = lintPQ({ questions: [{ stem: "q?", explanation: "because" }] });
    expect(f.find((x) => x.rule_id === "too_few_questions")).toBeTruthy();
  });
  it("flags missing explanations", () => {
    const f = lintPQ({ questions: Array(5).fill({ stem: "q?", bloom: "recall" }) });
    expect(f.find((x) => x.rule_id === "missing_explanations")).toBeTruthy();
  });
  it("flags low Bloom diversity", () => {
    const qs = Array(5).fill({ stem: "q?", explanation: "yes because reasons", bloom: "recall" });
    const f = lintPQ({ questions: qs });
    expect(f.find((x) => x.rule_id === "bloom_diversity")?.severity).toBe("minor");
  });
});

describe("lintGQ", () => {
  it("flags weight imbalance", () => {
    const qs = [
      { stem: "a", points: 10, rubric_text: "score against rubric a" },
      { stem: "b", points: 10, rubric_text: "score against rubric b" },
    ];
    const f = lintGQ({ questions: qs });
    expect(f.find((x) => x.rule_id === "weight_imbalance")?.severity).toBe("major");
  });
  it("flags zero-weight as critical", () => {
    const f = lintGQ({ questions: [{ stem: "a", points: 0, rubric_text: "rubric body" }] });
    expect(f.find((x) => x.rule_id === "weight_missing")?.severity).toBe("critical");
  });
});

describe("lintReading", () => {
  it("flags empty payload critical", () => {
    expect(lintReading(null).some((x) => x.severity === "critical")).toBe(true);
  });
  it("flags missing why_it_matters as minor", () => {
    const items = [
      { title: "T1", summary: "summary one", url: "https://x", reading_time_min: 5 },
      { title: "T2", summary: "summary two", url: "https://x", reading_time_min: 5 },
      { title: "T3", summary: "summary three", url: "https://x", reading_time_min: 5 },
    ];
    const f = lintReading({ items });
    expect(f.find((x) => x.rule_id === "missing_why")?.severity).toBe("minor");
  });
});

describe("lintAICoach", () => {
  it("flags thin system prompts", () => {
    expect(lintAICoach({ system: "be helpful" }).some((x) => x.rule_id === "thin_system_prompt")).toBe(true);
  });
});

describe("lintDiscussion", () => {
  it("requires a prompt", () => {
    expect(lintDiscussion(null).some((x) => x.rule_id === "no_prompt")).toBe(true);
  });
  it("nudges toward a question", () => {
    expect(lintDiscussion({ prompt: "Discuss this topic." }).some((x) => x.rule_id === "not_a_question")).toBe(true);
  });
});

describe("lintWorkedExample", () => {
  it("flags too few steps", () => {
    expect(lintWorkedExample({ steps: [{ text: "one" }] }).some((x) => x.rule_id === "too_few_steps")).toBe(true);
  });
});

describe("lintByKind dispatcher", () => {
  it("routes by kind", () => {
    expect(lintByKind("pq", null).length).toBeGreaterThan(0);
    expect(lintByKind("nonsense", null).length).toBe(0);
  });
});

describe("scoreFindings", () => {
  it("starts at 100 and deducts", () => {
    const r = scoreFindings([
      { rule_id: "a", severity: "critical", message: "", fix_prompt: "" },
      { rule_id: "b", severity: "major",    message: "", fix_prompt: "" },
      { rule_id: "c", severity: "minor",    message: "", fix_prompt: "" },
    ]);
    expect(r.critical).toBe(1);
    expect(r.major).toBe(1);
    expect(r.minor).toBe(1);
    expect(r.score).toBe(100 - 25 - 8 - 3);
  });
  it("clamps at 0", () => {
    const lots = Array(20).fill({ rule_id: "x", severity: "critical", message: "", fix_prompt: "" });
    expect(scoreFindings(lots).score).toBe(0);
  });
});
