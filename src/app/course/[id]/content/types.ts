// Shared shapes for the Content tab v2 UI. The page (server component) hydrates
// the rows from Supabase; everything below is client-side and consumes this
// shape.

export interface ContentItem {
  id: string;
  kind: string;            // 'pq' | 'gq' | 'reading' | 'scorm' | 'ai_coach'
  status: string;          // 'draft' | 'approved'
  payload: Record<string, unknown>;
  generated_at: string | null;
  approved_at: string | null;
  generation_error: string | null;
}

export interface ContentVideoRow {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  contentItems: ContentItem[];
}

// Tab order on the Content tab. Matches the lesson production sequence:
// reading first (deepest engagement), then formative checks (PQ), then
// summative (GQ), then worked example, discussion, SCORM bundle, AI Coach.
//
// `icon` was emoji in v1 — replaced with a soft initial in a tinted
// chip so labels render consistently across OS / font stacks. Components
// rendering the chip should use `KIND_META[k].icon` as a 1-2 char label
// inside a coloured pill (see KindChip below for the canonical pattern).
export const CONTENT_KINDS = [
  "reading", "pq", "gq", "worked_example", "discussion", "scorm", "ai_coach",
] as const;
export type ContentKindKey = (typeof CONTENT_KINDS)[number];

export const KIND_META: Record<ContentKindKey, { label: string; icon: string; sub: string; tone: string }> = {
  reading:        { label: "Reading",        icon: "Rd", tone: "bg-violet-50 text-violet-700",       sub: "Curated further-reading list with the why for each link" },
  pq:             { label: "Practice quiz",  icon: "PQ", tone: "bg-bi-blue-50 text-bi-blue-700",    sub: "5–10 formative questions · learner sees rationale immediately" },
  gq:             { label: "Assessment",     icon: "GQ", tone: "bg-bi-accent-50 text-bi-accent-700", sub: "3–5 graded questions · weighted · pass score · time limit" },
  worked_example: { label: "Worked example", icon: "WE", tone: "bg-emerald-50 text-emerald-700",     sub: "Step-by-step walkthrough of one canonical problem" },
  discussion:     { label: "Discussion",     icon: "Dx", tone: "bg-pink-50 text-pink-700",           sub: "Prompt + scaffolds for an asynchronous learner discussion" },
  scorm:          { label: "SCORM bundle",   icon: "SC", tone: "bg-teal-50 text-teal-700",           sub: "Downloadable export package · built after other artifacts approve" },
  ai_coach:       { label: "AI Coach",       icon: "AC", tone: "bg-orange-50 text-orange-700",       sub: "System prompt that powers the in-course AI coach for this video" },
};

export function findItem(row: ContentVideoRow, kind: ContentKindKey): ContentItem | null {
  return row.contentItems.find((i) => i.kind === kind) ?? null;
}
