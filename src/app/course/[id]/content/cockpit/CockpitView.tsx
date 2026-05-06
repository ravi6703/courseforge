"use client";

// Cockpit view — the default landing for the Content page.
//
// Coach feedback: "this page is cluttered, need product level overhaul"
// — the previous grid forced coaches to scan 84 cells to find work.
// Cockpit answers "what should I do next?" with a ranked action queue.
//
// Cards are derived from the current course state, ranked by urgency:
//   1. Stale items (something upstream changed → review needed)
//   2. Missing artifacts blocking near-complete modules
//   3. Drafts waiting on review
//   4. Missing artifact kinds (bottleneck) → bulk generate
//   5. Items in `generating` state with no movement (worker stuck)

import Link from "next/link";
import { ArrowRight, Sparkles, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../types";
import { bucketOf, type OverviewRow, type AggregateStats } from "./types";

interface ActionCard {
  id: string;
  priority: 1 | 2 | 3 | 4;
  icon: React.ComponentType<{ className?: string }>;
  tone: "rose" | "amber" | "blue" | "purple" | "emerald";
  title: string;
  body: string;
  cta: { label: string; href: string };
  meta?: string;
}

const TONE: Record<ActionCard["tone"], { bg: string; ring: string; iconBg: string; iconFg: string; ctaBg: string; ctaHover: string }> = {
  rose:    { bg: "bg-rose-50/50",      ring: "ring-rose-200",      iconBg: "bg-rose-100",      iconFg: "text-rose-700",      ctaBg: "bg-rose-600",      ctaHover: "hover:bg-rose-700" },
  amber:   { bg: "bg-amber-50/50",     ring: "ring-amber-200",     iconBg: "bg-amber-100",     iconFg: "text-amber-700",     ctaBg: "bg-amber-600",     ctaHover: "hover:bg-amber-700" },
  blue:    { bg: "bg-bi-blue-50/50",   ring: "ring-bi-blue-200",   iconBg: "bg-bi-blue-100",   iconFg: "text-bi-blue-700",   ctaBg: "bg-bi-blue-600",   ctaHover: "hover:bg-bi-blue-700" },
  purple:  { bg: "bg-purple-50/50",    ring: "ring-purple-200",    iconBg: "bg-purple-100",    iconFg: "text-purple-700",    ctaBg: "bg-purple-600",    ctaHover: "hover:bg-purple-700" },
  emerald: { bg: "bg-emerald-50/50",   ring: "ring-emerald-200",   iconBg: "bg-emerald-100",   iconFg: "text-emerald-700",   ctaBg: "bg-emerald-600",   ctaHover: "hover:bg-emerald-700" },
};

export function CockpitView({
  courseId,
  rows,
  stats,
}: {
  courseId: string;
  rows: OverviewRow[];
  stats: AggregateStats;
}) {
  const cards: ActionCard[] = [];

  // 1. Stale items
  if (stats.stale > 0) {
    cards.push({
      id: "stale",
      priority: 1,
      icon: AlertTriangle,
      tone: "rose",
      title: `${stats.stale} item${stats.stale > 1 ? "s" : ""} flagged stale`,
      body: "Upstream changes (course outcomes, lesson updates) have invalidated these artifacts. Review and regenerate to keep content aligned.",
      cta: { label: "Review stale items", href: `/course/${courseId}/content?view=stale` },
    });
  }

  // 2. Drafts waiting on review
  const draftRows: Array<{ row: OverviewRow; kind: string }> = [];
  rows.forEach((r) => {
    CONTENT_KINDS.forEach((k) => {
      const item = r.contentItems.find((i) => i.kind === k);
      if (bucketOf(item?.status) === "draft") draftRows.push({ row: r, kind: k });
    });
  });
  if (draftRows.length > 0) {
    cards.push({
      id: "drafts",
      priority: 2,
      icon: FileText,
      tone: "amber",
      title: `${draftRows.length} draft${draftRows.length > 1 ? "s" : ""} waiting on review`,
      body: "These artifacts have been generated but not yet approved. Open each, scan for issues, and approve to move them forward.",
      cta: {
        label: "Open first draft",
        href: `/course/${courseId}/content/lesson/${draftRows[0].row.lessonId}?k=${draftRows[0].kind}`,
      },
      meta: previewList(draftRows.slice(0, 3).map((d) => `${KIND_META[d.kind as ContentKindKey].label} · ${d.row.lessonTitle}`)),
    });
  }

  // 3. Bottleneck — most-missing artifact kind
  if (stats.bottleneckKind && stats.bottleneckRatio < 0.5) {
    const k = stats.bottleneckKind as ContentKindKey;
    const meta = KIND_META[k];
    const missing = stats.missing > 0 ? stats.missing : (rows.length - Math.round(stats.bottleneckRatio * rows.length));
    cards.push({
      id: "bottleneck",
      priority: 2,
      icon: Sparkles,
      tone: "blue",
      title: `${meta.label} is the bottleneck`,
      body: `Only ${Math.round(stats.bottleneckRatio * 100)}% of lessons have an approved ${meta.label}. Bulk-generate this kind across every lesson at once.`,
      cta: { label: `Generate all ${meta.label}`, href: `/course/${courseId}/content?view=artifacts&kind=${k}` },
      meta: `~${missing} lessons missing this artifact`,
    });
  }

  // 4. Generating items
  if (stats.generating > 0) {
    cards.push({
      id: "generating",
      priority: 3,
      icon: Sparkles,
      tone: "blue",
      title: `${stats.generating} item${stats.generating > 1 ? "s" : ""} generating`,
      body: "Background jobs are producing these artifacts (typically from transcripts). Refresh in a moment to see them appear.",
      cta: { label: "View progress", href: `/course/${courseId}/content?view=lessons` },
    });
  }

  // 5. Almost-done module — push it across the line
  const moduleStats = computeModuleProgress(rows);
  const almostDone = moduleStats
    .filter((m) => m.pct >= 60 && m.pct < 100)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 1);
  almostDone.forEach((m) => {
    cards.push({
      id: `almost-${m.moduleId}`,
      priority: 3,
      icon: ArrowRight,
      tone: "purple",
      title: `Module: ${m.moduleTitle} is ${m.pct}% complete`,
      body: `Only ${m.remaining} artifact${m.remaining > 1 ? "s" : ""} left. Push this module to 100% before starting another.`,
      cta: { label: "Open module lessons", href: `/course/${courseId}/content?view=lessons&module=${m.moduleId}` },
    });
  });

  // 6. All-clear case
  if (cards.length === 0) {
    cards.push({
      id: "all-clear",
      priority: 4,
      icon: CheckCircle2,
      tone: "emerald",
      title: "You're all caught up",
      body: "No stale items, no drafts pending review, no bottlenecks. Time to generate the next batch or take a break.",
      cta: { label: "Open lessons", href: `/course/${courseId}/content?view=lessons` },
    });
  }

  cards.sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold text-bi-navy-900">What needs your attention</h2>
        <span className="text-[11px] text-slate-500">Ranked by urgency · refreshes on every visit</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {cards.map((c) => {
          const t = TONE[c.tone];
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className={`rounded-lg ring-1 ${t.ring} ${t.bg} bg-white p-4 flex items-start gap-3`}
            >
              <span className={`${t.iconBg} ${t.iconFg} p-2 rounded-md shrink-0`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-slate-900">{c.title}</div>
                <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{c.body}</p>
                {c.meta && (
                  <div className="mt-1.5 text-[10.5px] text-slate-500 font-mono truncate" title={c.meta}>
                    {c.meta}
                  </div>
                )}
                <Link
                  href={c.cta.href}
                  className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-[12px] font-semibold ${t.ctaBg} ${t.ctaHover}`}
                >
                  {c.cta.label}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function computeModuleProgress(rows: OverviewRow[]) {
  const m = new Map<string, { moduleId: string; moduleTitle: string; total: number; approved: number }>();
  rows.forEach((r) => {
    const key = r.moduleId;
    const cur = m.get(key) ?? { moduleId: r.moduleId, moduleTitle: r.moduleTitle, total: 0, approved: 0 };
    CONTENT_KINDS.forEach((k) => {
      cur.total++;
      const item = r.contentItems.find((i) => i.kind === k);
      if (bucketOf(item?.status) === "approved") cur.approved++;
    });
    m.set(key, cur);
  });
  return Array.from(m.values()).map((x) => ({
    ...x,
    pct: x.total ? Math.round((x.approved / x.total) * 100) : 0,
    remaining: x.total - x.approved,
  }));
}

function previewList(items: string[]): string {
  if (items.length === 0) return "";
  return items.join(" · ");
}
