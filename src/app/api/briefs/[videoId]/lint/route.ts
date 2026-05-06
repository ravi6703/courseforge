// GET /api/briefs/[videoId]/lint
//
// Heuristic LO-vs-brief lint:
//   - Pulls the lesson's learning_objectives and course-level outcomes.
//   - Checks the brief's talking_points / key_takeaways for keyword
//     coverage of the LOs.
//   - Flags drift if too few LO keywords appear in the brief.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params;
  const sb = await getServerSupabase();

  const { data: video } = await sb
    .from("videos")
    .select("id, lesson_id, lessons(id, learning_objectives, title)")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return NextResponse.json({ error: "video not found" }, { status: 404 });

  const { data: brief } = await sb
    .from("content_briefs")
    .select("talking_points, key_takeaways, script_outline, content_type, script_required")
    .eq("video_id", videoId)
    .maybeSingle();

  const lessonObj = (video as unknown as { lessons?: { learning_objectives?: unknown; title?: string } }).lessons;
  const los = asStrings(lessonObj?.learning_objectives ?? []);
  const briefText = [
    ...asStrings(brief?.talking_points ?? []),
    ...asStrings(brief?.key_takeaways ?? []),
    String(brief?.script_outline ?? ""),
  ].join(" ").toLowerCase();

  const findings: Array<{ severity: "info" | "warn" | "error"; rule: string; title: string; body: string }> = [];

  if (!brief) {
    findings.push({ severity: "info", rule: "no-brief", title: "No brief generated yet", body: "Generate a brief to enable LO drift checks." });
  } else if (los.length === 0) {
    findings.push({ severity: "info", rule: "no-lo", title: "Lesson has no learning objectives", body: "Add objectives on the lesson so we can lint the brief against them." });
  } else {
    los.forEach((lo) => {
      const keywords = lo.toLowerCase().split(/\W+/).filter((w) => w.length >= 4);
      const hits = keywords.filter((k) => briefText.includes(k)).length;
      const ratio = keywords.length === 0 ? 1 : hits / keywords.length;
      if (ratio < 0.3) {
        findings.push({
          severity: "warn",
          rule: "lo-drift",
          title: `Brief barely covers an LO`,
          body: `Only ${Math.round(ratio * 100)}% of keywords from "${lo}" appear in the brief. Either tighten the brief or revise the LO.`,
        });
      }
    });
  }

  // Bloom heuristic: if LO uses an analyze/evaluate/create verb but the
  // brief is mostly bullet points (no scenarios / examples), flag it.
  if (los.some((l) => /\b(analyze|evaluate|design|build|create|critique)\b/i.test(l))) {
    const hasExample = /\b(example|case|scenario|step \d|workflow)\b/i.test(briefText);
    if (!hasExample) {
      findings.push({
        severity: "warn",
        rule: "high-bloom-no-example",
        title: "High-Bloom LO without a scenario in the brief",
        body: "Analyze/evaluate/create LOs need at least one worked example or scenario in the brief. Add one.",
      });
    }
  }

  return NextResponse.json({ findings });
}

function asStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => typeof x === "string" ? x : (x as { text?: string })?.text ?? "").filter(Boolean);
  if (typeof v === "string") return [v];
  return [];
}
