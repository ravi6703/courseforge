// Regression tests for the Content tab query shape.
//
// Topology after the lesson-scope migration:
//   /content/page.tsx                              — overview grid
//                                                    (lessons × kinds, minimal columns)
//   /content/lesson/[lessonId]/page.tsx            — per-lesson workspace
//                                                    (full payload columns)
//   /content/lesson/[lessonId]/[kind]/page.tsx     — focused single-kind editor
//
// Bugs we never want to re-introduce:
//   1. videos.recording_duration — column doesn't exist (it's duration_minutes)
//   2. content_items v9 columns lost (kind/payload/etc.) on the per-lesson page

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const OVERVIEW = readFileSync(
  join(__dirname, "..", "src/app/course/[id]/content/page.tsx"),
  "utf8",
);

const PER_LESSON = readFileSync(
  join(__dirname, "..", "src/app/course/[id]/content/lesson/[lessonId]/page.tsx"),
  "utf8",
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
  it("traverses modules -> lessons -> videos + content_items", () => {
    // The select uses nested parens, so we just check that all the table
    // names appear in the right relative order in the source.
    const idxModules      = OVERVIEW.indexOf("modules(");
    const idxLessons      = OVERVIEW.indexOf("lessons(", idxModules);
    const idxVideos       = OVERVIEW.indexOf("videos(", idxLessons);
    const idxContentItems = OVERVIEW.indexOf("content_items(", idxLessons);
    expect(idxModules).toBeGreaterThan(-1);
    expect(idxLessons).toBeGreaterThan(idxModules);
    expect(idxVideos).toBeGreaterThan(idxLessons);
    expect(idxContentItems).toBeGreaterThan(idxLessons);
  });
});

describe("Per-lesson content workspace page", () => {
  it("requests the v9 content_items columns (kind, payload, etc)", () => {
    expect(PER_LESSON).toContain("kind");
    expect(PER_LESSON).toContain("payload");
    expect(PER_LESSON).toContain("generated_at");
    expect(PER_LESSON).toContain("approved_at");
  });
});
