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
// summative (GQ), then SCORM bundle, then AI Coach (advanced/optional).
export const CONTENT_KINDS = ["reading", "pq", "gq", "scorm", "ai_coach"] as const;
export type ContentKindKey = (typeof CONTENT_KINDS)[number];

export const KIND_META: Record<ContentKindKey, { label: string; icon: string; sub: string }> = {
  reading:  { label: "Reading",        icon: "📖", sub: "Curated further-reading list with the why for each link" },
  pq:       { label: "Practice quiz",  icon: "✏️", sub: "5–10 formative questions · learner sees rationale immediately" },
  gq:       { label: "Assessment",     icon: "📝", sub: "3–5 graded questions · weighted · pass score · time limit" },
  scorm:    { label: "SCORM bundle",   icon: "📦", sub: "Downloadable export package · built after other artifacts approve" },
  ai_coach: { label: "AI Coach",       icon: "🤖", sub: "System prompt that powers the in-course AI coach for this video" },
};

export function findItem(row: ContentVideoRow, kind: ContentKindKey): ContentItem | null {
  return row.contentItems.find((i) => i.kind === kind) ?? null;
}
