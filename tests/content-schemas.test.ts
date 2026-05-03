import { describe, it, expect } from "vitest";
import {
  ContentPQPayloadSchema,
  ContentGQPayloadSchema,
  ContentReadingPayloadSchema,
  ContentAICoachPayloadSchema,
  GenerateContentItemSchema,
} from "@/lib/validation/schemas";

describe("Content schemas — Zod validation", () => {
  describe("ContentPQPayloadSchema", () => {
    it("accepts a valid practice questions payload", () => {
      const payload = {
        questions: [
          {
            id: "pq_1",
            type: "mcq",
            stem: "What is X?",
            options: [
              { id: "a", text: "Option A" },
              { id: "b", text: "Option B" },
            ],
            correct_answer: "a",
            explanation: "A is correct because...",
            difficulty: "easy",
            bloom_level: "recall",
          },
        ],
      };
      const r = ContentPQPayloadSchema.safeParse(payload);
      expect(r.success).toBe(true);
    });

    it("rejects missing type field", () => {
      const payload = {
        questions: [
          {
            id: "pq_1",
            stem: "What is X?",
            correct_answer: "a",
            explanation: "A is correct",
            difficulty: "easy",
            bloom_level: "recall",
          },
        ],
      };
      const r = ContentPQPayloadSchema.safeParse(payload);
      expect(r.success).toBe(false);
    });

    it("accepts short answer questions", () => {
      const payload = {
        questions: [
          {
            id: "pq_1",
            type: "short_answer",
            stem: "Explain X",
            correct_answer: "The answer is...",
            explanation: "Because...",
            difficulty: "medium",
            bloom_level: "understand",
          },
        ],
      };
      const r = ContentPQPayloadSchema.safeParse(payload);
      expect(r.success).toBe(true);
    });
  });

  describe("ContentGQPayloadSchema", () => {
    it("accepts valid graded questions", () => {
      const payload = {
        questions: [
          {
            id: "gq_1",
            type: "mcq",
            stem: "Complex question?",
            options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
            correct_answer: "a",
            explanation: "Full credit for A...",
            difficulty: "hard",
            bloom_level: "analyze",
            points: 10,
            rubric_text: "Full (10): correct. Partial (5): close. Zero (0): wrong.",
            graded: true,
          },
        ],
        total_points: 10,
      };
      const r = ContentGQPayloadSchema.safeParse(payload);
      expect(r.success).toBe(true);
    });
  });

  describe("ContentReadingPayloadSchema", () => {
    it("accepts valid readings payload", () => {
      const payload = {
        items: [
          {
            id: "read_1",
            title: "Deep dive into X",
            summary: "This article explores X in detail across 100 words minimum to be useful.",
            suggested_url: "https://example.com/article",
            why_it_matters: "Helps understand the core concept.",
            reading_time_minutes: 15,
          },
        ],
      };
      const r = ContentReadingPayloadSchema.safeParse(payload);
      expect(r.success).toBe(true);
    });
  });

  describe("ContentAICoachPayloadSchema", () => {
    it("accepts valid AI coach payload", () => {
      const payload = {
        system_prompt:
          "You are an expert study buddy. You help learners master the concepts from the transcript. You ask guiding questions and provide scaffolding. You keep responses concise and encouraging.",
      };
      const r = ContentAICoachPayloadSchema.safeParse(payload);
      expect(r.success).toBe(true);
    });
  });

  describe("GenerateContentItemSchema", () => {
    it("accepts valid generate request", () => {
      const body = {
        video_id: "123e4567-e89b-12d3-a456-426614174000",
        kind: "pq",
      };
      const r = GenerateContentItemSchema.safeParse(body);
      expect(r.success).toBe(true);
    });
  });
});
