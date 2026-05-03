// Validation surface for the new /api/content/bulk route. We can't hit the
// real DB from a vitest run, but we can pin (a) the request schema, and
// (b) the action enum so a typo can't sneak in.

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the schema the route uses. If the route's schema diverges
// from this, the test will silently still pass — so we also pin the
// route source itself further down.
const BodySchema = z.object({
  video_id: z.string().uuid(),
  action: z.enum(["approve_ready", "regen_all"]),
});

describe("/api/content/bulk request schema", () => {
  it("accepts approve_ready with a valid uuid", () => {
    const r = BodySchema.safeParse({
      video_id: "11111111-1111-1111-1111-111111111111",
      action: "approve_ready",
    });
    expect(r.success).toBe(true);
  });

  it("accepts regen_all", () => {
    const r = BodySchema.safeParse({
      video_id: "11111111-1111-1111-1111-111111111111",
      action: "regen_all",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown action", () => {
    const r = BodySchema.safeParse({
      video_id: "11111111-1111-1111-1111-111111111111",
      action: "approve_all", // typo — caught by enum
    });
    expect(r.success).toBe(false);
  });

  it("rejects a non-uuid video_id", () => {
    const r = BodySchema.safeParse({ video_id: "not-a-uuid", action: "approve_ready" });
    expect(r.success).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("/api/content/bulk route source", () => {
  const ROUTE = readFileSync(join(__dirname, "..", "src/app/api/content/bulk/route.ts"), "utf8");

  it("auths with requireUser", () => {
    expect(ROUTE).toContain("requireUser");
  });

  it("flips draft items to approved on approve_ready", () => {
    expect(ROUTE).toContain('"approve_ready"');
    expect(ROUTE).toContain('status: "approved"');
    expect(ROUTE).toContain('.eq("status", "draft")');
  });

  it("returns the (video_id, kind) regen list for client-side fan-out", () => {
    expect(ROUTE).toContain("regenerate");
    expect(ROUTE).toContain("kind: i.kind");
  });
});
