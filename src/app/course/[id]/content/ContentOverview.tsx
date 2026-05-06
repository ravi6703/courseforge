"use client";

// Content overview — module cards layout (v2).
//
// Coach feedback v2: the lessons × icons grid was unscannable. The 7
// artifact codes (RD/PQ/GQ/WE/DX/SC/AC) appearing as tiny circles
// across columns made it hard to see which lesson needs work.
//
// New layout:
//   - One card per module. Module title shown ONCE at the top of the
//     card, never repeated per lesson row.
//   - Each lesson row has a horizontal pip strip with full label
//     (Reading · Quiz · Assessment …) sized so it's readable.
//   - A status filter chip row at the top (All / Missing / Draft /
//     In review / Approved / Generating) filters cards in place.
//   - Search lives in the page header only — no second search box.

import Link from "next/link";
import { useMemo, useState } from "react";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "./types";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

interface OverviewRow {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleOrder: number;
  videoCount: number;
  contentItems: Array<{ id: string; kind: string; status: string; stale_since?: string | null }>;
}

type FilterMode = "all" | "missing" | "draft" | "in_review" | "approved" | "generating";

const FILTERS: Array<{ id: FilterMode; label: string; tone: string }> = [
  { id: "all",        label: "All",         tone: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "missing",    label: "Missing",     tone: "bg-slate-50 text-slate-600 border-slate-200" },
  { id: "draft",      label: "Draft",       tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "generating", label: "Generating",  tone: "bg-bi-blue-50 text-bi-blue-700 border-bi-blue-200" },
  { id: "in_review",  label: "In review",   tone: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "approved",   label: "Approved",    tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

// Map raw db status → our filter bucket.
function bucketOf(status: string | undefined): FilterMode {
  if (!status) return "missing";
  if (status === "approved") return "approved";
  if (status === "in_review") return "in_review";
  if (status === "generating") return "generating";
  return "draft";
}

const PIP_TONE: Record<FilterMode, { bg: string; fg: string; ring: string }> = {
  all:        { bg: "bg-slate-50",     fg: "text-slate-500",   ring: "ring-slate-200" },
  missing:    { bg: "bg-slate-50",     fg: "text-slate-400",   ring: "ring-slate-200" },
  draft:      { bg: "bg-amber-50",     fg: "text-amber-700",   ring: "ring-amber-200" },
  generating: { bg: "bg-bi-blue-50",   fg: "text-bi-blue-700", ring: "ring-bi-blue-300" },
  in_review:  { bg: "bg-purple-50",    fg: "text-purple-700",  ring: "ring-purple-200" },
  approved:   { bg: "bg-emerald-50",   fg: "text-emerald-700", ring: "ring-emerald-200" },
};

export function ContentOverview({
  courseId, rows,
}: {
  courseId: string;
  rows: OverviewRow[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Aggregate counts for the header.
  const totalCells = rows.length * CONTENT_KINDS.length;
  const cellsByBucket: Record<FilterMode, number> = {
    all: totalCells, missing: 0, draft: 0, in_review: 0, approved: 0, generating: 0,
  };
  rows.forEach((r) => {
    CONTENT_KINDS.forEach((k) => {
      const item = r.contentItems.find((i) => i.kind === k);
      cellsByBucket[bucketOf(item?.status)]++;
    });
  });

  const visible = useMemo(
    () => rows.filter((r) =>
      !q || r.lessonTitle.toLowerCase().includes(q.toLowerCase())
        || r.moduleTitle.toLowerCase().includes(q.toLowerCase())
    ),
    [rows, q],
  );

  // Group by module, preserving order.
  const grouped = useMemo(() => {
    const m = new Map<string, { moduleTitle: string; moduleOrder: number; rows: OverviewRow[] }>();
    visible.forEach((r) => {
      const k = r.moduleTitle || "Module";
      const g = m.get(k);
      if (g) g.rows.push(r);
      else m.set(k, { moduleTitle: r.moduleTitle || "Module", moduleOrder: r.moduleOrder, rows: [r] });
    });
    return Array.from(m.values()).sort((a, b) => a.moduleOrder - b.moduleOrder);
  }, [visible]);

  // Lesson passes the filter if it has at least one cell in that bucket
  // (or `all` is selected).
  const lessonInFilter = (r: OverviewRow): boolean => {
    if (filter === "all") return true;
    return CONTENT_KINDS.some((k) => {
      const item = r.contentItems.find((i) => i.kind === k);
      return bucketOf(item?.status) === filter;
    });
  };

  const generatingCells = cellsByBucket.generating;

  return (
    <div className="space-y-3">
      {generatingCells > 0 && (
        <div className="rounded-lg border border-bi-blue-200 bg-bi-blue-50 px-4 py-2.5 text-[12.5px] text-bi-blue-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bi-blue-600 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>
          <span>
            <span className="font-bold">{generatingCells}</span> asset{generatingCells > 1 ? "s" : ""} generating from transcripts.
            They&apos;ll appear in their lesson cards as soon as they&apos;re ready.
          </span>
        </div>
      )}

      <header className="bg-white border border-bi-navy-100 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Lesson artifacts</div>
          <div className="text-[20px] font-semibold text-bi-navy-800">
            {cellsByBucket.approved}<span className="text-[13px] font-normal text-bi-navy-500"> / {totalCells} approved</span>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="h-1.5 bg-bi-navy-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-300" style={{ width: `${totalCells ? Math.round((cellsByBucket.approved / totalCells) * 100) : 0}%` }} />
          </div>
          <div className="text-[11px] text-bi-navy-500 mt-1">
            {cellsByBucket.draft} draft · {cellsByBucket.in_review} in review · {cellsByBucket.missing} missing · click any pip to open or generate that artifact
          </div>
        </div>
        <div className="inline-flex items-center gap-2 border border-bi-navy-100 bg-white rounded-lg px-3 py-1.5 w-72">
          <Search className="w-3.5 h-3.5 text-bi-navy-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Find lesson…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-bi-navy-900 placeholder:text-bi-navy-400"
          />
        </div>
      </header>

      {/* Status filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          const n = cellsByBucket[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-all ${
                isActive ? `${f.tone} ring-2 ring-offset-1 ring-current/30` : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span className="font-mono tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Module cards */}
      <div className="space-y-3">
        {grouped.length === 0 ? (
          <div className="bg-white border border-dashed border-bi-navy-200 rounded-lg p-12 text-center text-[13px] text-bi-navy-500">
            {rows.length === 0 ? "No lessons yet — generate a TOC first." : "No lessons match your search."}
          </div>
        ) : grouped.map((g) => {
          const filteredRows = g.rows.filter(lessonInFilter);
          if (filteredRows.length === 0) return null;
          const isCol = collapsed[g.moduleTitle] ?? false;
          // Module-level approved %
          const moduleCells = g.rows.length * CONTENT_KINDS.length;
          const moduleApproved = g.rows.reduce(
            (s, r) => s + CONTENT_KINDS.reduce(
              (c, k) => c + ((r.contentItems.find((i) => i.kind === k)?.status === "approved") ? 1 : 0),
              0
            ),
            0,
          );
          const pct = moduleCells ? Math.round((moduleApproved / moduleCells) * 100) : 0;
          return (
            <section key={g.moduleTitle} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <header className="px-4 py-2.5 flex items-center gap-3 border-b border-slate-200 bg-slate-50">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [g.moduleTitle]: !isCol }))}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500"
                  aria-label={isCol ? "Expand" : "Collapse"}
                >
                  {isCol ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">
                    Module {g.moduleOrder}
                  </div>
                  <div className="text-[14px] font-bold text-slate-900 truncate">{g.moduleTitle}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700 tabular-nums w-10 text-right">{pct}%</span>
                </div>
              </header>

              {!isCol && (
                <ul className="divide-y divide-slate-100">
                  {filteredRows.map((r) => (
                    <li key={r.lessonId} className="px-4 py-2.5 hover:bg-slate-50/60">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/course/${courseId}/content/lesson/${r.lessonId}`}
                          className="flex-1 min-w-0"
                        >
                          <div className="text-[13px] font-semibold text-slate-900 truncate hover:text-bi-blue-700">
                            {r.lessonTitle}
                          </div>
                          <div className="text-[10.5px] text-slate-500">
                            {r.videoCount} video{r.videoCount === 1 ? "" : "s"}
                          </div>
                        </Link>
                        {/* Pip strip */}
                        <div className="flex items-center gap-1 flex-wrap shrink-0">
                          {CONTENT_KINDS.map((k) => {
                            const item = r.contentItems.find((i) => i.kind === k);
                            const bucket = bucketOf(item?.status);
                            const t = PIP_TONE[bucket];
                            const meta = KIND_META[k as ContentKindKey];
                            const isStale = !!item?.stale_since;
                            return (
                              <Link
                                key={k}
                                href={`/course/${courseId}/content/lesson/${r.lessonId}?k=${k}`}
                                title={`${meta.label} — ${bucket.replace("_", " ")}${isStale ? " · stale" : ""}`}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ring-1 ${t.bg} ${t.fg} ${t.ring} text-[10px] font-bold transition-all hover:brightness-95 ${isStale ? "outline outline-1 outline-orange-300" : ""}`}
                              >
                                <span className="font-mono">{meta.icon}</span>
                                <span className="hidden xl:inline">{meta.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
