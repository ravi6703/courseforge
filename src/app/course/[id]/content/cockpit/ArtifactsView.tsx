"use client";

// By-Artifact view — pivots the grid so the rows are LESSONS and the
// active "kind" is a sub-tab. This matches how coaches actually work:
// "do all readings now, all quizzes tomorrow." Bulk-generate buttons
// at the module and course level fire one POST per missing artifact.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Sparkles, Loader2, ChevronRight } from "lucide-react";
import { CONTENT_KINDS, KIND_META, type ContentKindKey } from "../types";
import { bucketOf, BUCKET_TONE, type OverviewRow } from "./types";

export function ArtifactsView({
  courseId,
  rows,
}: {
  courseId: string;
  rows: OverviewRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const initialKind = (sp.get("kind") as ContentKindKey) || (CONTENT_KINDS[0] as ContentKindKey);
  const [activeKind, setActiveKind] = useState<ContentKindKey>(
    CONTENT_KINDS.includes(initialKind as (typeof CONTENT_KINDS)[number]) ? initialKind : (CONTENT_KINDS[0] as ContentKindKey),
  );

  const [busyAll, setBusyAll] = useState(false);
  const [busyModule, setBusyModule] = useState<Record<string, boolean>>({});

  const setKind = (k: ContentKindKey) => {
    setActiveKind(k);
    const p = new URLSearchParams(sp.toString());
    p.set("kind", k);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // Compute counts per kind for the sub-tab badges.
  const countsByKind = useMemo(() => {
    const m: Record<string, { missing: number; draft: number; approved: number }> = {};
    for (const k of CONTENT_KINDS) m[k] = { missing: 0, draft: 0, approved: 0 };
    rows.forEach((r) => {
      CONTENT_KINDS.forEach((k) => {
        const item = r.contentItems.find((i) => i.kind === k);
        const b = bucketOf(item?.status);
        if (b === "missing") m[k].missing++;
        else if (b === "approved") m[k].approved++;
        else m[k].draft++;
      });
    });
    return m;
  }, [rows]);

  // Group by module for the active kind.
  const grouped = useMemo(() => {
    const m = new Map<string, { moduleId: string; moduleTitle: string; moduleOrder: number; rows: Array<{ row: OverviewRow; bucket: ReturnType<typeof bucketOf>; stale: boolean }> }>();
    rows.forEach((r) => {
      const item = r.contentItems.find((i) => i.kind === activeKind);
      const bucket = bucketOf(item?.status);
      const cur = m.get(r.moduleId) ?? {
        moduleId: r.moduleId, moduleTitle: r.moduleTitle, moduleOrder: r.moduleOrder, rows: [],
      };
      cur.rows.push({ row: r, bucket, stale: !!item?.stale_since });
      m.set(r.moduleId, cur);
    });
    return Array.from(m.values()).sort((a, b) => a.moduleOrder - b.moduleOrder);
  }, [rows, activeKind]);

  // Bulk generate via the existing /api/content/generate endpoint.
  // It accepts { lesson_id, kind } and is lesson-scoped.
  const generateForRow = async (row: OverviewRow) => {
    return fetch(`/api/content/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: row.lessonId, kind: activeKind }),
    }).catch(() => null);
  };
  void courseId; // currently only used by Link hrefs below

  const generateAll = async () => {
    setBusyAll(true);
    const targets = rows.filter((r) => bucketOf(r.contentItems.find((i) => i.kind === activeKind)?.status) === "missing");
    for (const r of targets) await generateForRow(r);
    setBusyAll(false);
    router.refresh();
  };

  const generateModule = async (moduleId: string) => {
    setBusyModule((b) => ({ ...b, [moduleId]: true }));
    try {
      const targets = rows.filter((r) =>
        r.moduleId === moduleId &&
        bucketOf(r.contentItems.find((i) => i.kind === activeKind)?.status) === "missing"
      );
      for (const r of targets) await generateForRow(r);
      router.refresh();
    } finally {
      setBusyModule((b) => ({ ...b, [moduleId]: false }));
    }
  };

  const meta = KIND_META[activeKind];
  const kCounts = countsByKind[activeKind];
  const totalMissing = kCounts.missing;

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {CONTENT_KINDS.map((k) => {
          const c = countsByKind[k];
          const isActive = k === activeKind;
          const m = KIND_META[k as ContentKindKey];
          return (
            <button
              key={k}
              onClick={() => setKind(k as ContentKindKey)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                isActive ? `${m.tone} ring-2 ring-current/30` : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title={m.sub}
            >
              {m.label}
              <span className="font-mono tabular-nums opacity-70 text-[10.5px]">
                {c.approved}/{c.approved + c.draft + c.missing}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-bi-blue-600 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-bold text-slate-900">
            {meta.label}: {totalMissing} lesson{totalMissing === 1 ? "" : "s"} missing
          </div>
          <p className="text-[12px] text-slate-600 mt-0.5">{meta.sub}</p>
        </div>
        {totalMissing > 0 && (
          <button
            onClick={generateAll}
            disabled={busyAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-600 text-white text-[12.5px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50 shrink-0"
          >
            {busyAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate all ({totalMissing})
          </button>
        )}
      </div>

      {/* Module groups */}
      <div className="space-y-2">
        {grouped.map((g) => {
          const missingInModule = g.rows.filter((r) => r.bucket === "missing").length;
          const isModBusy = busyModule[g.moduleId];
          return (
            <section key={g.moduleId} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <header className="px-4 py-2.5 flex items-center gap-3 border-b border-slate-200 bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Module {g.moduleOrder}</div>
                  <div className="text-[13.5px] font-bold text-slate-900 truncate">{g.moduleTitle}</div>
                </div>
                {missingInModule > 0 ? (
                  <button
                    onClick={() => generateModule(g.moduleId)}
                    disabled={isModBusy}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-[11.5px] font-semibold text-slate-700 hover:bg-white disabled:opacity-50 shrink-0"
                  >
                    {isModBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generate {missingInModule} in module
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-700 font-bold">All done in module</span>
                )}
              </header>
              <ul className="divide-y divide-slate-100">
                {g.rows.map((r) => {
                  const t = BUCKET_TONE[r.bucket];
                  return (
                    <li key={r.row.lessonId} className="px-4 py-2 flex items-center gap-3 hover:bg-slate-50/60">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/course/${courseId}/content/lesson/${r.row.lessonId}?k=${activeKind}`}
                          className="text-[12.5px] font-semibold text-slate-900 hover:text-bi-blue-700 truncate block"
                        >
                          {r.row.lessonTitle}
                        </Link>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold ring-1 ${t.bg} ${t.fg} ${t.ring} ${r.stale ? "outline outline-2 outline-orange-300" : ""}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                        {t.label}{r.stale ? " · stale" : ""}
                      </span>
                      <Link
                        href={`/course/${courseId}/content/lesson/${r.row.lessonId}?k=${activeKind}`}
                        className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5 shrink-0"
                      >
                        Open <ChevronRight className="w-3 h-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
