import { describe, it, expect } from "vitest";
import { buildAICoachSystemPrompt } from "@/lib/ai/prompts/content/ai_coach";

describe("AI Coach — system prompt assembly", () => {
  const baseInput = {
    video_title: "Introduction to Recursion",
    lesson_title: "Recursion Fundamentals",
    module_title: "Advanced Programming",
    transcript: "Recursion is when a function calls itself. Every recursive function needs a base case.",
  };

  it("builds system prompt from transcript alone", () => {
    const prompt = buildAICoachSystemPrompt(baseInput);
    expect(prompt).toContain("study buddy");
    expect(prompt).toContain("Introduction to Recursion");
  });

  it("includes learning objective when provided", () => {
    const prompt = buildAICoachSystemPrompt({
      ...baseInput,
      learning_objective: "Understand recursion",
    });
    expect(prompt).toContain("LEARNING OBJECTIVE");
    expect(prompt).toContain("Understand recursion");
  });

  it("includes audience when provided", () => {
    const prompt = buildAICoachSystemPrompt({
      ...baseInput,
      audience: "CS students",
    });
    expect(prompt).toContain("TARGET AUDIENCE");
    expect(prompt).toContain("CS students");
  });

  it("includes guidelines for conversation", () => {
    const prompt = buildAICoachSystemPrompt(baseInput);
    expect(prompt).toContain("GUIDELINES");
    expect(prompt).toContain("conversational");
  });

  it("embeds practice questions if provided", () => {
    const pq = JSON.stringify({ questions: [{ id: "pq_1" }] });
    const prompt = buildAICoachSystemPrompt({ ...baseInput, practice_questions: pq });
    expect(prompt).toContain("PRACTICE QUESTIONS");
    expect(prompt).toContain("pq_1");
  });
});
