// Vocab compliance check — does the text use the must-include terms,
// and does it avoid the banned terms?

export interface VocabCheckResult {
  must_include_present: string[];
  must_include_missing: string[];
  banned_present: string[];
  ok: boolean;
}

function findTerm(text: string, term: string): boolean {
  if (!term.trim()) return false;
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(text);
}

export function vocabCheck(text: string, mustInclude: string[], banned: string[]): VocabCheckResult {
  const t = text || "";
  const must_include_present: string[] = [];
  const must_include_missing: string[] = [];
  for (const term of mustInclude.filter(Boolean)) {
    (findTerm(t, term) ? must_include_present : must_include_missing).push(term);
  }
  const banned_present = banned.filter(Boolean).filter((term) => findTerm(t, term));
  const ok =
    banned_present.length === 0 &&
    (mustInclude.length === 0 || must_include_present.length >= Math.ceil(mustInclude.length / 2));
  return { must_include_present, must_include_missing, banned_present, ok };
}
