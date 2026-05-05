import { describe, it, expect } from "vitest";
import { readability, bandLabel } from "@/lib/format/readability";
import { vocabCheck } from "@/lib/format/vocabCheck";

describe("readability", () => {
  it("returns 0 grade for empty input", () => {
    expect(readability("").fleschKincaid).toBe(0);
  });
  it("simple sentence reads at elementary level", () => {
    const r = readability("The cat sat on the mat. The dog ran fast.");
    expect(r.level).toMatch(/elementary|middle/);
  });
  it("complex prose reads at college+ level", () => {
    const r = readability(
      "The orchestration of decentralised cryptographic primitives presupposes a sophisticated comprehension of distributed consensus mechanisms and Byzantine fault tolerance."
    );
    expect(r.fleschKincaid).toBeGreaterThan(12);
    expect(r.level).toMatch(/college|graduate/);
  });
});

describe("bandLabel", () => {
  it("flags below for too-easy text vs intermediate audience", () => {
    expect(bandLabel(5, "intermediate").label).toBe("below");
  });
  it("flags above for too-hard text vs beginner audience", () => {
    expect(bandLabel(13, "beginner").label).toBe("above");
  });
  it("flags match for in-band text", () => {
    expect(bandLabel(11, "intermediate").label).toBe("match");
  });
});

describe("vocabCheck", () => {
  it("ok when no constraints", () => {
    expect(vocabCheck("anything", [], []).ok).toBe(true);
  });
  it("flags banned terms", () => {
    const r = vocabCheck("we use a pipeline of nodes", [], ["pipeline"]);
    expect(r.banned_present).toEqual(["pipeline"]);
    expect(r.ok).toBe(false);
  });
  it("flags missing must-include terms", () => {
    const r = vocabCheck("we use n8n nodes", ["workflow", "trigger", "node"], []);
    expect(r.must_include_missing).toContain("workflow");
    expect(r.must_include_missing).toContain("trigger");
    expect(r.must_include_present).toContain("node");
  });
  it("ok when ≥ half must-include present and no banned", () => {
    const r = vocabCheck("workflow + trigger + node ftw", ["workflow", "trigger", "node", "credential"], ["pipeline"]);
    expect(r.ok).toBe(true);
  });
  it("matches whole words only", () => {
    const r = vocabCheck("subnodes are not nodes", ["node"], []);
    expect(r.must_include_present).toContain("node"); // 'nodes' -> matches 'node' as whole word
  });
});
