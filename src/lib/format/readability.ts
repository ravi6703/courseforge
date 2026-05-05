// Flesch-Kincaid grade-level approximation. Naive syllable counting,
// good enough for "is this brief reading at the configured audience
// level" coach-facing feedback.

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches?.length ?? 1);
}

export interface ReadabilityResult {
  fleschKincaid: number;
  words: number;
  sentences: number;
  syllables: number;
  level: "elementary" | "middle" | "high" | "college" | "graduate";
}

export function readability(text: string): ReadabilityResult {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return { fleschKincaid: 0, words: 0, sentences: 0, syllables: 0, level: "elementary" };

  const words = cleaned.split(/\s+/).filter(Boolean);
  const sentences = Math.max(1, (cleaned.match(/[.!?]+/g) ?? []).length);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const grade =
    0.39 * (words.length / sentences) +
    11.8 * (syllables / Math.max(1, words.length)) -
    15.59;

  const fk = Math.max(0, Math.round(grade * 10) / 10);
  const level =
    fk <= 6  ? "elementary" :
    fk <= 9  ? "middle"     :
    fk <= 12 ? "high"       :
    fk <= 15 ? "college"    :
               "graduate";

  return { fleschKincaid: fk, words: words.length, sentences, syllables, level };
}

export const AUDIENCE_BAND: Record<"beginner" | "intermediate" | "advanced", { min: number; max: number }> = {
  beginner:     { min: 6,  max: 9  },
  intermediate: { min: 9,  max: 13 },
  advanced:     { min: 12, max: 16 },
};

export function bandLabel(grade: number, audience: "beginner" | "intermediate" | "advanced"): {
  label: "below" | "match" | "above"; tone: "amber" | "emerald" | "red";
} {
  const band = AUDIENCE_BAND[audience];
  if (grade < band.min) return { label: "below", tone: "amber" };
  if (grade > band.max) return { label: "above", tone: "red" };
  return { label: "match", tone: "emerald" };
}
