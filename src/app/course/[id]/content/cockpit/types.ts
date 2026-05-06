// Shared shapes for the v3 Content cockpit.
// Server hydrates rows from Supabase; everything below is client-side.

import { CONTENT_KINDS } from "../types";

export type StatusBucket = "missing" | "draft" | "generating" | "in_review" | "approved";

/** Rolled-up overview row passed from the server page. */
export interface OverviewRow {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  videoCount: number;
  contentItems: Array<{ id: string; kind: string; status: string; stale_since?: string | null }>;
}

export type View = "cockpit" | "lessons" | "artifacts" | "stale";

export const VIEW_TABS: Array<{ id: View; label: string; sub: string }> = [
  { id: "cockpit",   label: "Cockpit",     sub: "What needs your attention" },
  { id: "lessons",   label: "By lesson",   sub: "Lesson-by-lesson detail" },
  { id: "artifacts", label: "By artifact", sub: "Bulk-produce by type" },
  { id: "stale",     label: "Stale",       sub: "Review items flagged stale" },
];

/** Bucket the raw db status string into a coarser display bucket. */
export function bucketOf(status: string | undefined): StatusBucket {
  if (!status) return "missing";
  if (status === "approved") return "approved";
  if (status === "in_review") return "in_review";
  if (status === "generating") return "generating";
  return "draft";
}

/** Tone classes per bucket — used for pills. */
export const BUCKET_TONE: Record<StatusBucket, { bg: string; fg: string; ring: string; dot: string; label: string }> = {
  missing:    { bg: "bg-slate-50",     fg: "text-slate-500",   ring: "ring-slate-200",   dot: "bg-slate-400",   label: "Not started" },
  draft:      { bg: "bg-amber-50",     fg: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500",   label: "Draft" },
  generating: { bg: "bg-bi-blue-50",   fg: "text-bi-blue-700", ring: "ring-bi-blue-300", dot: "bg-bi-blue-500", label: "Generating" },
  in_review:  { bg: "bg-purple-50",    fg: "text-purple-700",  ring: "ring-purple-200",  dot: "bg-purple-500",  label: "In review" },
  approved:   { bg: "bg-emerald-50",   fg: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500", label: "Approved" },
};

/** Aggregate every cell in the course into bucket counts + extras. */
export interface AggregateStats {
  approved: number;
  draft: number;
  generating: number;
  in_review: number;
  missing: number;
  stale: number;
  total: number;
  /** Bottleneck = the artifact kind with the lowest approved-rate. */
  bottleneckKind: string | null;
  bottleneckRatio: number;
}

export function aggregate(rows: OverviewRow[]): AggregateStats {
  const tot = rows.length * CONTENT_KINDS.length;
  const counts: Record<StatusBucket, number> = {
    missing: 0, draft: 0, generating: 0, in_review: 0, approved: 0,
  };
  let stale = 0;

  // Per-kind approved tracking → bottleneck detection.
  const byKindApproved: Record<string, { approved: number; total: number }> = {};
  for (const k of CONTENT_KINDS) byKindApproved[k] = { approved: 0, total: 0 };

  rows.forEach((r) => {
    CONTENT_KINDS.forEach((k) => {
      const item = r.contentItems.find((i) => i.kind === k);
      const b = bucketOf(item?.status);
      counts[b]++;
      if (item?.stale_since) stale++;
      byKindApproved[k].total++;
      if (b === "approved") byKindApproved[k].approved++;
    });
  });

  // Bottleneck = lowest approved/total ratio among kinds with at least 1 row.
  let bottleneckKind: string | null = null;
  let bottleneckRatio = 1.1;
  for (const [k, v] of Object.entries(byKindApproved)) {
    if (v.total === 0) continue;
    const ratio = v.approved / v.total;
    if (ratio < bottleneckRatio) {
      bottleneckRatio = ratio;
      bottleneckKind = k;
    }
  }

  return {
    ...counts,
    stale,
    total: tot,
    bottleneckKind,
    bottleneckRatio,
  };
}
