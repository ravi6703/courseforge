import { describe, it, expect } from "vitest";
import {
  buildPQPrompt,
  buildGQPrompt,
  buildReadingPrompt,
  buildScormPrompt,
  buildAICoachPrompt,
} from "@/lib/ai/prompts/content";

describe("Content Prompt Builders", () => {
  describe("buildPQPrompt", () => {
    it("generates prompt with system and user", () => {
      const prompt = buildPQPrompt(
        "Introduction to Recursion",
        "Recursion is when a function calls itself...",
        "Recursion Fundamentals",
        "Advanced Programming",
        "Computer Science 101"
      );
      expect(prompt).toHaveProperty("system");
      expect(prompt).toHaveProperty("user");
      expect(typeof prompt.system).toBe("string");
      expect(typeof prompt.user).toBe("string");
    });

    it("system prompt is non-empty", () => {
      const prompt = buildPQPrompt(
        "Title",
        "Transcript content",
        "Lesson",
        "Module",
        "Course"
      );
      expect(prompt.system.length).toBeGreaterThan(50);
    });
  });

  describe("buildGQPrompt", () => {
    it("generates graded question prompt", () => {
      const prompt = buildGQPrompt(
        "GQ Lesson",
        "Content",
        "GQ Module",
        "GQ Lesson Title",
        "GQ Course"
      );
      expect(prompt).toHaveProperty("system");
      expect(prompt).toHaveProperty("user");
    });
  });

  describe("buildReadingPrompt", () => {
    it("generates reading prompt", () => {
      const prompt = buildReadingPrompt(
        "Reading Title",
        "Reading content",
        "Reading Lesson",
        "Reading Module",
        "Reading Course"
      );
      expect(prompt).toHaveProperty("system");
      expect(prompt).toHaveProperty("user");
    });
  });

  describe("buildScormPrompt", () => {
    it("generates SCORM prompt", () => {
      const prompt = buildScormPrompt(
        "SCORM Title",
        "SCORM content",
        "SCORM Lesson",
        "SCORM Module",
        "SCORM Course"
      );
      expect(prompt).toHaveProperty("system");
      expect(prompt).toHaveProperty("user");
    });
  });

  describe("buildAICoachPrompt", () => {
    it("generates AI coach prompt structure", () => {
      const prompt = buildAICoachPrompt(
        "AI Coach Title",
        "AI Coach content",
        "AI Coach Lesson",
        "AI Coach Module",
        "AI Coach Course"
      );
      expect(prompt).toHaveProperty("system");
      expect(prompt).toHaveProperty("user");
    });

    it("system prompt is non-empty", () => {
      const prompt = buildAICoachPrompt(
        "Title",
        "Content",
        "Lesson",
        "Module",
        "Course"
      );
      expect(prompt.system.length).toBeGreaterThan(50);
    });

    it("user prompt is non-empty", () => {
      const prompt = buildAICoachPrompt(
        "Title",
        "Content",
        "Lesson",
        "Module",
        "Course"
      );
      expect(prompt.user.length).toBeGreaterThan(10);
    });
  });
});
