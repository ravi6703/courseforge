import { describe, it, expect } from "vitest";
import {
  ContentKindSchema,
  GenerateContentItemSchema,
  PatchContentSchema,
} from "@/lib/validation/schemas";

describe("Content Schemas — Zod validation", () => {
  describe("ContentKindSchema", () => {
    it("accepts all 5 kinds", () => {
      const kinds = ["pq", "gq", "reading", "scorm", "ai_coach"];
      kinds.forEach((kind) => {
        const result = ContentKindSchema.safeParse(kind);
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid kind", () => {
      const result = ContentKindSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });
  });

  describe("GenerateContentItemSchema", () => {
    it("accepts valid generate request", () => {
      const payload = {
        video_id: "550e8400-e29b-41d4-a716-446655440000",
        kind: "pq",
      };
      const result = GenerateContentItemSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects missing video_id", () => {
      const payload = {
        kind: "pq",
      };
      const result = GenerateContentItemSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects invalid kind", () => {
      const payload = {
        video_id: "550e8400-e29b-41d4-a716-446655440000",
        kind: "invalid",
      };
      const result = GenerateContentItemSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("PatchContentSchema", () => {
    it("accepts status update to approved", () => {
      const payload = { status: "approved" };
      const result = PatchContentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("accepts status update to draft", () => {
      const payload = { status: "draft" };
      const result = PatchContentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const payload = { status: "publishing" };
      const result = PatchContentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("accepts empty payload object", () => {
      const payload = {};
      const result = PatchContentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("accepts optional payload field", () => {
      const payload = { payload: { test: "data" }, status: "approved" };
      const result = PatchContentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("ContentKindSchema — all values", () => {
    it("practice questions kind", () => {
      expect(ContentKindSchema.safeParse("pq").success).toBe(true);
    });

    it("graded questions kind", () => {
      expect(ContentKindSchema.safeParse("gq").success).toBe(true);
    });

    it("reading kind", () => {
      expect(ContentKindSchema.safeParse("reading").success).toBe(true);
    });

    it("scorm kind", () => {
      expect(ContentKindSchema.safeParse("scorm").success).toBe(true);
    });

    it("ai coach kind", () => {
      expect(ContentKindSchema.safeParse("ai_coach").success).toBe(true);
    });
  });
});
