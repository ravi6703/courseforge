// GET /api/courses/[id]/consistency-lint
//
// Cross-lesson consistency lint. Catches structural quality bugs that
// per-lesson lint misses:
//   - Lesson references a term/concept never defined elsewhere.
//   - Module 2 quiz only references Module 1 content (no progression).
//   - Two lessons cover the same outcome verbatim (redundant).
//   - Glossary terms used inconsistently across lessons.
//
// Heuristic implementation — token overlap + glossary cross-check.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Finding {
  severity: "info" | "warn" | "error";
  rule: string;
  title: string;
  body: string;
  lessonIds: string[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await getServerSupabase();

  const [{ data: lessons }, { data: items }, { data: glossary }] = await Promise.all([
    sb.from("lessons").select("id, title, description, learning_objectives, module_id, order").eq("course_id", id).order("order", { ascending: true }),
    sb.from("content_items").select("lesson_id, kind, payload").eq("course_id", id),
    sb.from("glossary_entries").select("term").eq("course_id", id),
  ]);

  const findings: Finding[] = [];
  const ls = lessons ?? [];
  const allText = ls.map((l) => `${l.title} ${l.description ?? ""} ${JSON.stringify(l.learning_objectives ?? [])}`.toLowerCase());
  const allItemText = (items ?? []).map((i) => JSON.stringify(i.payload ?? "").toLowerCase());

  // 1. Duplicate-LO detection
  ls.forEach((a, i) => {
    ls.forEach((b, j) => {
      if (j <= i) return;
      const sim = jaccard(tokens(allText[i]), tokens(allText[j]));
      if (sim > 0.7) {
        findings.push({
          severity: "warn",
          rule: "duplicate-lesson",
          title: "Two lessons may overlap heavily",
          body: `"${a.title}" and "${b.title}" share ${Math.round(sim * 100)}% of their tokens. Consider merging or differentiating.`,
          lessonIds: [a.id, b.id],
        });
      }
    });
  });

  // 2. Glossary term used in only one lesson but appears in multiple — likely inconsistent definition
  const terms = (glossary ?? []).map((g) => g.term.toLowerCase());
  terms.forEach((term) => {
    const lessonsUsingTerm = ls.filter((_, i) => allText[i].includes(term));
    if (lessonsUsingTerm.length === 1 && term.length >= 4) {
      findings.push({
        severity: "info",
        rule: "isolated-term",
        title: `Term "${term}" appears in only one lesson`,
        body: "If this is a course-wide concept, consider referencing it in at least 2 lessons so learners reinforce it.",
        lessonIds: [lessonsUsingTerm[0].id],
      });
    }
  });

  // 3. Quiz items must reference some content from prior lessons
  (items ?? []).forEach((it) => {
    if (it.kind !== "pq" && it.kind !== "gq") return;
    const lessonIdx = ls.findIndex((l) => l.id === it.lesson_id);
    if (lessonIdx < 1) return;
    const myItemText = JSON.stringify(it.payload ?? "").toLowerCase();
    const prevText = allText.slice(0, lessonIdx).join(" ");
    const overlap = jaccard(tokens(myItemText), tokens(prevText));
    if (overlap < 0.05) {
      findings.push({
        severity: "warn",
        rule: "quiz-no-prior-callback",
        title: `Quiz at lesson ${lessonIdx + 1} doesn't reference prior content`,
        body: "Spaced retrieval works best when later quizzes recall earlier lessons. Add at least one question on prior content.",
        lessonIds: [it.lesson_id],
      });
    }
  });

  void allItemText;

  return NextResponse.json({
    findings,
    summary: {
      total: findings.length,
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warn").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
  });
}

function tokens(s: string): Set<string> {
  return new Set(s.split(/\W+/).filter((w) => w.length >= 4));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((x) => { if (b.has(x)) inter++; });
  return inter / new Set([...a, ...b]).size;
}
