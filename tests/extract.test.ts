import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/ai/extract/json";

describe("extractJson — handles common LLM output shapes", () => {
  it("parses a raw JSON array", () => {
    const r = extractJson<number[]>("[1, 2, 3]");
    expect(r.ok && r.value).toEqual([1, 2, 3]);
  });

  it("strips ```json fences", () => {
    const r = extractJson<{ a: number }[]>("```json\n[{\"a\":1}]\n```");
    expect(r.ok && r.value).toEqual([{ a: 1 }]);
  });

  it("strips plain ``` fences without language tag", () => {
    const r = extractJson("```\n[\"x\"]\n```");
    expect(r.ok && r.value).toEqual(["x"]);
  });

  it("ignores leading prose before the array", () => {
    const r = extractJson("Sure! Here is the TOC:\n[1, 2]");
    expect(r.ok && r.value).toEqual([1, 2]);
  });

  it("ignores trailing prose after the array (bracket-counted slice)", () => {
    const r = extractJson("[1, 2]\n\nLet me know if you want changes!");
    expect(r.ok && r.value).toEqual([1, 2]);
  });

  it("handles nested brackets without confusion", () => {
    const r = extractJson<{ items: number[] }[]>("[{\"items\": [1, 2, 3]}]");
    expect(r.ok && r.value).toEqual([{ items: [1, 2, 3] }]);
  });

  it("respects strings: brackets inside string literals don't end the array", () => {
    const r = extractJson<string[]>("[\"hi ] there\", \"ok\"]");
    expect(r.ok && r.value).toEqual(["hi ] there", "ok"]);
  });

  it("respects escaped quotes inside strings", () => {
    const r = extractJson<string[]>("[\"hi \\\"there\\\"\", \"ok\"]");
    expect(r.ok && r.value).toEqual(['hi "there"', "ok"]);
  });

  it("returns ok:false on empty input", () => {
    const r = extractJson("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("empty");
  });

  it("returns ok:false on no array", () => {
    const r = extractJson("Sorry, I cannot do that.");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("no '['");
  });

  it("returns ok:false on truncated array", () => {
    const r = extractJson("[1, 2, 3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("unbalanced");
  });

  it("returns the raw response when parsing fails (for log surfacing)", () => {
    const r = extractJson("Here's what I think: [not valid json]");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.raw).toContain("Here's what I think");
    }
  });

  it("works on objects with kind=object", () => {
    const r = extractJson("```json\n{\"a\":1}\n```", "object");
    expect(r.ok && r.value).toEqual({ a: 1 });
  });
});
