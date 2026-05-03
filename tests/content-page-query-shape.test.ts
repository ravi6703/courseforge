// Regression tests for the Content tab query shape. The Content page
// shipped with two bugs that surfaced as 'Course not found':
//
//   1. videos.recording_duration — column doesn't exist (it's duration_minutes)
//   2. videos -> content_items nested join — the v9 migration silently no-op'd
//      because IF NOT EXISTS hit a legacy table. Callers requesting kind/payload
//      etc. on the legacy shape fail.
//
// We can't unit-test the SQL shape end to end here (no DB), but we can pin the
// page source so a stale column name can't sneak back in.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PAGE = readFileSync(
  join(__dirname, "..", "src/app/course/[id]/content/page.tsx"),
  "utf8"
);

describe("Content tab page query shape", () => {
  it("selects duration_minutes (not the non-existent recording_duration)", () => {
    expect(PAGE).toContain("duration_minutes");
    expect(PAGE).not.toContain("recording_duration");
  });

  it("requests the v9 content_items columns (kind, payload, etc)", () => {
    expect(PAGE).toContain("kind");
    expect(PAGE).toContain("payload");
    expect(PAGE).toContain("generated_at");
    expect(PAGE).toContain("approved_at");
  });

  it("traverses modules -> lessons -> videos -> content_items", () => {
    // Pin the topology so a refactor doesn't quietly flatten the tree.
    expect(PAGE).toMatch(/modules\([^)]*lessons\(/s);
    expect(PAGE).toMatch(/lessons\([^)]*videos\(/s);
    expect(PAGE).toMatch(/videos\([^)]*content_items\(/s);
  });
});
