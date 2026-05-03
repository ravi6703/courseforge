import { describe, it, expect } from "vitest";
import { buildPQPrompt } from "@/lib/ai/prompts/content/pq";
import { buildGQPrompt } from "@/lib/ai/prompts/content/gq";
import { buildReadingPrompt } from "@/lib/ai/prompts/content/reading";
import { buildAICoachSystemPrompt } from "@/lib/ai/prompts/content/ai_coach";

describe("Content prompts", () => {
  const sampleTranscript = "In this video, we explore machine learning. It's a subset of AI.";

  describe("buildPQPrompt", () => {
    it("generates prompt with required fields", () => {
      const prompt = buildPQPrompt({
        video_title: "ML Basics",
        lesson_title: "Intro",
        module_title: "AI",
        transcript: sampleTranscript,
      });
      expect(prompt).toContain("practice questions");
      expect(prompt).toContain("ML Basics");
    });

    it("includes optional context when provided", () => {
      const prompt = buildPQPrompt({
        video_title: "ML",
        lesson_title: "Intro",
        module_title: "AI",
        transcript: sampleTranscript,
        audience: "undergraduates",
        prerequisites: "Python",
        learning_objective: "Understand ML types",
      });
      expect(prompt).toContain("undergraduates");
      expect(prompt).toContain("Python");
    });
  });

  describe("buildGQPrompt", () => {
    it("generates graded questions prompt", () => {
      const prompt = buildGQPrompt({
        video_title: "ML",
        lesson_title: "Intro",
        module_title: "AI",
        transcript: sampleTranscript,
      });
      expect(prompt).toContain("graded");
      expect(prompt).toContain("assessment");
    });
  });

  describe("buildReadingPrompt", () => {
    it("generates readings prompt", () => {
      const prompt = buildReadingPrompt({
        video_title: "ML",
        lesson_title: "Intro",
        module_title: "AI",
        transcript: sampleTranscript,
      });
      expect(prompt).toContain("supplemental reading");
      expect(prompt).toContain("80-100 words");
    });
  });

  describe("buildAICoachSystemPrompt", () => {
    it("generates comprehensive system prompt", () => {
      const prompt = buildAICoachSystemPrompt({
        video_title: "ML",
        lesson_title: "Intro",
        module_title: "AI",
        transcript: sampleTranscript,
      });
      expect(prompt).toContain("study buddy");
      expect(prompt).toContain(sampleTranscript);
    });

    it("includes all optional fields when provided", () => {
      const prompt = buildAICoachSystemPrompt({
        video_title: "ML",
        lesson_title: "Intro",
        module_title: "AI",
        transcript: sampleTranscript,
        audience: "undergraduates",
        prerequisites: "Python",
        learning_objective: "Understand ML",
      });
      expect(prompt).toContain("TARGET AUDIENCE");
      expect(prompt).toContain("PREREQUISITE");
      expect(prompt).toContain("LEARNING OBJECTIVE");
    });
  });
});
