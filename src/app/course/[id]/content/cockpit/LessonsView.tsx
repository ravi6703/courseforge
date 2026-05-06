"use client";

// By-Lesson view — module cards with refined lesson cards inside.
//
// Coach feedback: the previous grid had module titles repeated 30+ times
// and 7 cryptic letter codes (RD/PQ/GQ/WE/DX/SC/AC) that nobody could
// scan. This version:
//   - Module heading appears ONCE per section (sticky)
//   - Lesson "rows" are now visual cards in a 2-col grid
//   - Artifact pills use FULL labels (Reading / Quiz / Assessment / …)
//   - Status filter chip row at top
//   - Click a pill → opens that artifact directly

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Search, Video as VideoIcon } from "lucide-react";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../types";
import { bucketOf, BUCKET_TONE, type OverviewRow, type StatusBucket } from "./types";

type FilterMode = "all" | StatusBucket;

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all",        label: "All" },
  { id: "missing",    label: "Missing" },
  { id: "draft",      label: "Draft" },
  { id: "generating", label: "Generating" },
  { id: "in_review",  label: "In review" },
  { id: "approved",   label: "Approved" },
];

export function LessonsView({
  courseId,
  rows,
}: {
  courseId: string;
  rows: OverviewRow[];
}) {
  const sp = useSearchParams();
  const focusedModule = sp.get("module");

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const visible = useMemo(
    () => rows.filter((r) =>
      (!q || r.lessonTitle.toLowerCase().includes(q.toLowerCase())
         || r.moduleTitle.toLowerCase().includes(q.toLowerCase()))
      && (!focusedModule || r.moduleId === focusedModule),
    ),
    [rows, q, focusedModule],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, { moduleId: string; moduleTitle: string; moduleOrder: number; rows: OverviewRow[] }>();
    visible.forEach((r) => {
      const cur = m.get(r.moduleId);
      if (cur) cur.rows.push(r);
      else m.set(r.moduleId, { moduleId: r.moduleId, moduleTitle: r.moduleTitle, moduleOrder: r.moduleOrder, rows: [r] });
    });
    return Array.from(m.values()).sort((a, b) => a.moduleOrder - b.moduleOrder);
  }, [visible]);

  const lessonInFilter = (r: OverviewRow): boolean => {
    if (filter === "all") return true;
    return CONTENT_KINDS.some((k) => bucketOf(r.contentItems.find((i) => i.kind === k)?.status) === filter);
  };

  // Bucket counts for filter chips
  const counts: Record<FilterMode, number> = { all: 0, missing: 0, draft: 0, generating: 0, in_review: 0, approved: 0 };
  rows.forEach((r) => {
    CONTENT_KINDS.forEach((k) => {
      counts.all++;
      counts[bucketOf(r.contentItems.find((i) => i.kind === k)?.status)]++;
    });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 border border-bi-navy-100 bg-white rounded-lg px-3 py-1.5 w-72">
          <Search className="w-3.5 h-3.5 text-bi-navy-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Find lesson…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-bi-navy-900 placeholder:text-bi-navy-400"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-all ${
                  isActive ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
                <span className="font-mono tabular-nums opacity-70">{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white border border-dashed border-bi-navy-200 rounded-lg p-12 text-center text-[13px] text-bi-navy-500">
          {rows.length === 0 ? "No lessons yet — generate a TOC first." : "No lessons match your filter."}
        </div>
      ) : grouped.map((g) => {
        const filteredRows = g.rows.filter(lessonInFilter);
        if (filteredRows.length === 0) return null;
        const isCol = collapsed[g.moduleId] ?? false;
        const moduleCells = g.rows.length * CONTENT_KINDS.length;
        const moduleApproved = g.rows.reduce(
          (s, r) => s + CONTENT_KINDS.reduce((c, k) => c + (bucketOf(r.contentItems.find((i) => i.kind === k)?.status) === "approved" ? 1 : 0), 0),
          0,
        );
        const pct = moduleCells ? Math.round((moduleApproved / moduleCells) * 100) : 0;

        return (
          <section key={g.moduleId} className="space-y-2">
            {/* Module header — appears ONCE per section */}
            <header className="sticky top-0 z-10 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [g.moduleId]: !isCol }))}
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                aria-label={isCol ? "Expand" : "Collapse"}
              >
                {isCol ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Module {g.moduleOrder}</div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {filteredRows.map((r) => (
                  <LessonCard key={r.lessonId} courseId={courseId} row={r} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LessonCard({ courseId, row }: { courseId: string; row: OverviewRow }) {
  const items = CONTENT_KINDS.map((k) => {
    const item = row.contentItems.find((i) => i.kind === k);
    return {
      kind: k as ContentKindKey,
      bucket: bucketOf(item?.status),
      stale: !!item?.stale_since,
    };
  });
  const approved = items.filter((i) => i.bucket === "approved").length;
  const pct = Math.round((approved / items.length) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-bi-blue-200 transition-colors">
      <Link href={`/course/${courseId}/content/lesson/${row.lessonId}`} className="block min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-slate-900 line-clamp-2 hover:text-bi-blue-700">
              {row.lessonTitle}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-0.5 inline-flex items-center gap-1.5">
              <VideoIcon className="w-3 h-3" /> {row.videoCount} video{row.videoCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600 tabular-nums w-7 text-right">{pct}%</span>
          </div>
        </div>
      </Link>
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {items.map((i) => {
          const t = BUCKET_TONE[i.bucket];
          const meta = KIND_META[i.kind];
          return (
            <Link
              key={i.kind}
              href={`/course/${courseId}/content/lesson/${row.lessonId}?k=${i.kind}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ring-1 ${t.bg} ${t.fg} ${t.ring} text-[10.5px] font-semibold transition-all hover:brightness-95 ${i.stale ? "outline outline-2 outline-orange-300" : ""}`}
              title={`${meta.label} · ${t.label}${i.stale ? " · stale" : ""}`}
            >
              <span className={`w-1 h-1 rounded-full ${t.dot}`} />
              <span>{meta.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
