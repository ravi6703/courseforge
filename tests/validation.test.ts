import { describe, it, expect } from "vitest";
import { CourseUpsertSchema, SyncTocSchema, parseBody, GenerateContentSchema } from "@/lib/validation/schemas";

describe("validation/schemas", () => {
  it("CourseUpsertSchema accepts a minimal valid body", () => {
    const r = CourseUpsertSchema.safeParse({ title: "Hello", duration_weeks: 4, hours_per_week: 5 });
    expect(r.success).toBe(true);
  });

  it("CourseUpsertSchema rejects negative duration", () => {
    const r = CourseUpsertSchema.safeParse({ duration_weeks: -1 });
    expect(r.success).toBe(false);
  });

  it("CourseUpsertSchema rejects unknown platform", () => {
    const r = CourseUpsertSchema.safeParse({ platform: "evil-lms" });
    expect(r.success).toBe(false);
  });

  it("CourseUpsertSchema rejects target_job_roles > 20", () => {
    const r = CourseUpsertSchema.safeParse({
      target_job_roles: Array.from({ length: 21 }, (_, i) => `r${i}`),
    });
    expect(r.success).toBe(false);
  });

  it("SyncTocSchema rejects videos with > 180 minute duration", () => {
    const r = SyncTocSchema.safeParse({
      modules: [{
        title: "M", lessons: [{
          title: "L", videos: [{ title: "V", duration_minutes: 999 }],
        }],
      }],
    });
    expect(r.success).toBe(false);
  });

  it("GenerateContentSchema rejects invalid type", () => {
    const r = GenerateContentSchema.safeParse({
      lessonId: "l1", lessonTitle: "x", type: "video", courseTitle: "c", moduleTitle: "m",
    });
    expect(r.success).toBe(false);
  });

  it("parseBody returns 400 NextResponse with field paths on failure", async () => {
    const r = parseBody(CourseUpsertSchema, { duration_weeks: "not a number" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.res.status).toBe(400);
      const body = await r.res.json();
      expect(body.error).toBe("Invalid request body");
      expect(body.issues[0].path).toBe("duration_weeks");
    }
  });
});
