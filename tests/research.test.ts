import { describe, it, expect, beforeEach } from "vitest";
import { researchProvider, research } from "@/lib/research";

describe("research/provider", () => {
  beforeEach(() => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.BRAVE_API_KEY;
  });

  it("falls back when no key is set", () => {
    expect(researchProvider()).toBe("fallback");
  });

  it("research() returns a fallback shape with live=false when no provider", async () => {
    const r = await research({ domain: "Generative AI", title: "x", target_job_roles: ["AI Engineer"] });
    expect(r.live).toBe(false);
    expect(r.provider).toBe("fallback");
    expect(r.competitors.length).toBeGreaterThan(0);
    expect(r.competitors[0].weaknesses.join(" ")).toContain("connect TAVILY_API_KEY");
  });
});
