import { describe, it, expect } from "vitest";
import { buildAICoachPrompt } from "@/lib/ai/prompts/content";

describe("Content AI Coach Prompt Assembly", () => {
  it("generates AI coach prompt with system and user fields", () => {
    const result = buildAICoachPrompt(
      "Introduction to Recursion",
      "Recursion is when a function calls itself with proper base case...",
      "Recursion Fundamentals",
      "Advanced Programming",
      "Computer Science 101"
    );
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
    expect(typeof result.system).toBe("string");
    expect(typeof result.user).toBe("string");
  });

  it("system prompt is substantial", () => {
    const result = buildAICoachPrompt(
      "Title",
      "Content here",
      "Lesson",
      "Module",
      "Course"
    );
    expect(result.system.length).toBeGreaterThan(100);
  });

  it("user prompt is substantial", () => {
    const result = buildAICoachPrompt(
      "Title",
      "Content here",
      "Lesson",
      "Module",
      "Course"
    );
    expect(result.user.length).toBeGreaterThan(20);
  });

  it("handles different video contexts", () => {
    const result = buildAICoachPrompt(
      "Variables and Data Types",
      "Understanding how to declare and use variables...",
      "Fundamentals",
      "Python Basics",
      "Intro to Programming"
    );
    expect(result.system.length).toBeGreaterThan(50);
  });

  it("system prompt remains string with edge case parameters", () => {
    const result = buildAICoachPrompt(
      "Short Title",
      "Brief content",
      "L",
      "M",
      "C"
    );
    expect(typeof result.system).toBe("string");
    expect(result.system.length).toBeGreaterThan(0);
  });
});
