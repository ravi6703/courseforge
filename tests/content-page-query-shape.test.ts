// Regression tests for the Content tab query shape.
//
// History:
//   /content/page.tsx       — overview grid only (id/kind/status/stale_since)
//   /content/[videoId]/page.tsx — per-video workspace (full payload columns)
//
// Bugs we never want to re-introduce:
//   1. videos.recording_duration — column doesn't exist (it's duration_minutes)
//   2. content_items v9 columns lost (kind/payload/etc.) on the per-video page
//
// We can't unit-test SQL shape end to end (no DB), but we pin the source.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const OVERVIEW = readFileSync(
  join(__dirname, "..", "src/app/course/[id]/content/page.tsx"),
  "utf8"
);

const PER_VIDEO = readFileSync(
  join(__dirname, "..", "src/app/course/[id]/content/[videoId]/page.tsx"),
  "utf8"
);

describe("Content overview page", () => {
  it("requests the minimal columns the grid needs", () => {
    expect(OVERVIEW).toContain("kind");
    expect(OVERVIEW).toContain("status");
    expect(OVERVIEW).toContain("stale_since");
  });
  it("never asks for the non-existent recording_duration column", () => {
    expect(OVERVIEW).not.toContain("recording_duration");
  });
  it("traverses modules -> lessons -> videos -> content_items", () => {
    expect(OVERVIEW).toMatch(/modules\([^)]*lessons\(/s);
    expect(OVERVIEW).toMatch(/lessons\([^)]*videos\(/s);
    expect(OVERVIEW).toMatch(/videos\([^)]*content_items\(/s);
  });
});

describe("Per-video content workspace page", () => {
  it("requests the v9 content_items columns (kind, payload, etc)", () => {
    expect(PER_VIDEO).toContain("kind");
    expect(PER_VIDEO).toContain("payload");
    expect(PER_VIDEO).toContain("generated_at");
    expect(PER_VIDEO).toContain("approved_at");
  });
});
