// Regression test — pinning the table/column names that
// /api/content/generate uses to fetch the transcript. The route shipped
// with `.from("transcriptions").select("text")`, which never matched
// any row; that broke transcript→content for the entire pilot. This
// test will fail loudly if anyone reverts to that shape.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE = readFileSync(
  join(__dirname, "..", "src/app/api/content/generate/route.ts"),
  "utf8"
);

describe("/api/content/generate transcript source", () => {
  it("queries the transcripts table (not transcriptions)", () => {
    expect(ROUTE).toContain('.from("transcripts")');
    expect(ROUTE).not.toContain('.from("transcriptions")');
  });

  it("selects the text_content column (not text)", () => {
    expect(ROUTE).toContain("text_content");
    // narrow check — the legacy code used .select("text") which is
    // distinct from .select("text_content")
    expect(ROUTE).not.toMatch(/\.select\("text"\)/);
  });

  it("uses maybeSingle to handle missing transcripts gracefully", () => {
    expect(ROUTE).toContain("maybeSingle");
  });

  it("uses the canonical claude-sonnet-4-6 model id", () => {
    expect(ROUTE).toContain('"claude-sonnet-4-6"');
    expect(ROUTE).not.toContain("claude-3-5-sonnet-20241022");
  });
});
