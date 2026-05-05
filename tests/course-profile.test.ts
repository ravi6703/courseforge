import { describe, it, expect } from "vitest";
import { DEFAULT_PROFILE, TONE_PRESETS } from "@/types/course-profile";
// dynamic import to avoid pulling Supabase types into the test
import * as profileLib from "@/lib/course-profile";

describe("course-profile / buildPromptFragment", () => {
  it("renders a minimal fragment when the profile is default", () => {
    const out = profileLib.buildPromptFragment(DEFAULT_PROFILE);
    expect(out).toContain("<course_profile>");
    expect(out).toContain("</course_profile>");
    expect(out).toContain("Tone: Educational");          // default tone
    expect(out).toContain("70% theory");                 // default ratio
  });

  it("includes audience persona when set", () => {
    const out = profileLib.buildPromptFragment({
      ...DEFAULT_PROFILE,
      audience: { primary_persona: "Backend dev, 2-5y", level: "intermediate", secondary_personas: [] },
    });
    expect(out).toContain("Backend dev, 2-5y (intermediate)");
  });

  it("emits must-include and banned vocabulary lines only when populated", () => {
    const empty = profileLib.buildPromptFragment(DEFAULT_PROFILE);
    expect(empty).not.toContain("Must-include");
    expect(empty).not.toContain("Avoid these terms");

    const filled = profileLib.buildPromptFragment({
      ...DEFAULT_PROFILE,
      vocabulary: { must_include: ["workflow", "trigger"], banned: ["pipeline"] },
    });
    expect(filled).toContain("Must-include vocabulary: workflow, trigger.");
    expect(filled).toContain("Avoid these terms: pipeline.");
  });

  it("caps reading list at 5 entries in the prompt", () => {
    const long = Array.from({ length: 8 }, (_, i) => ({ title: `Paper ${i}`, url: `https://x/${i}`, why: "" }));
    const out = profileLib.buildPromptFragment({ ...DEFAULT_PROFILE, reading_list: long });
    expect(out.match(/Paper /g)?.length).toBe(5);
  });
});

describe("TONE_PRESETS — exhaustive", () => {
  it("has 6 canonical tones, each with a label and a what", () => {
    expect(TONE_PRESETS).toHaveLength(6);
    for (const t of TONE_PRESETS) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.what.length).toBeGreaterThan(20);
    }
  });
});

describe("summarizeProfile", () => {
  it("includes tone and theory ratio", () => {
    const out = profileLib.summarizeProfile(DEFAULT_PROFILE);
    expect(out).toMatch(/Educational/);
    expect(out).toMatch(/70% theory/);
  });
});
