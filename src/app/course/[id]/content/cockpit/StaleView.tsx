"use client";

// Stale view — items where stale_since IS NOT NULL.
//
// Coaches can blast through these in one session: regenerate to pick
// up the upstream change, or mark reviewed (clear the stale flag) if
// the artifact is still fine as-is, or dismiss (just hide it).

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Check, X, AlertTriangle } from "lucide-react";
import { KIND_META, type ContentKindKey } from "../types";
import type { OverviewRow } from "./types";

interface StaleItem {
  itemId: string;
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleOrder: number;
  kind: string;
  staleSince: string;
  status: string;
}

export function StaleView({
  courseId,
  rows,
}: {
  courseId: string;
  rows: OverviewRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, "regen" | "review" | "dismiss" | null>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const items = useMemo<StaleItem[]>(() => {
    const all: StaleItem[] = [];
    rows.forEach((r) => {
      r.contentItems.forEach((ci) => {
        if (ci.stale_since) {
          all.push({
            itemId: ci.id,
            lessonId: r.lessonId,
            lessonTitle: r.lessonTitle,
            moduleTitle: r.moduleTitle,
            moduleOrder: r.moduleOrder,
            kind: ci.kind,
            staleSince: ci.stale_since,
            status: ci.status,
          });
        }
      });
    });
    return all
      .filter((i) => !dismissed.has(i.itemId))
      .sort((a, b) => new Date(b.staleSince).getTime() - new Date(a.staleSince).getTime());
  }, [rows, dismissed]);

  const regenerate = async (item: StaleItem) => {
    setBusy((b) => ({ ...b, [item.itemId]: "regen" }));
    try {
      await fetch(`/api/content/${item.itemId}/regenerate`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy((b) => ({ ...b, [item.itemId]: null }));
    }
  };

  const markReviewed = async (item: StaleItem) => {
    setBusy((b) => ({ ...b, [item.itemId]: "review" }));
    try {
      await fetch(`/api/content/${item.itemId}/clear-stale`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy((b) => ({ ...b, [item.itemId]: null }));
    }
  };

  const dismiss = (item: StaleItem) => {
    setDismissed((d) => new Set([...d, item.itemId]));
  };

  void courseId;

  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-emerald-200 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mb-3">
          <Check className="w-5 h-5" />
        </div>
        <div className="text-[14px] font-bold text-slate-900">No stale items</div>
        <p className="text-[12.5px] text-slate-500 mt-1">
          Every artifact reflects the latest course outcomes. Nice and tidy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-orange-200 bg-orange-50/60 px-4 py-2.5 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-orange-700 mt-0.5 shrink-0" />
        <div className="text-[12.5px] text-orange-900">
          <span className="font-bold">{items.length} item{items.length > 1 ? "s" : ""}</span> went stale because outcomes
          changed upstream. <span className="font-semibold">Regenerate</span> to pick up the change,
          {" "}<span className="font-semibold">Mark reviewed</span> if it&apos;s still fine, or
          {" "}<span className="font-semibold">Dismiss</span> to hide.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {items.map((it) => {
            const meta = KIND_META[it.kind as ContentKindKey];
            const b = busy[it.itemId];
            const days = Math.max(0, Math.round((Date.now() - new Date(it.staleSince).getTime()) / 86_400_000));
            return (
              <li key={it.itemId} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">
                    M{it.moduleOrder} · {it.moduleTitle}
                  </div>
                  <div className="text-[13px] font-bold text-slate-900 truncate">
                    {it.lessonTitle}
                    <span className="ml-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      · {meta?.label ?? it.kind}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-orange-700 font-mono mt-0.5">
                    Stale {days === 0 ? "today" : `${days}d ago`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => regenerate(it)}
                    disabled={!!b}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-bi-blue-600 text-white text-[11px] font-semibold hover:bg-bi-blue-700 disabled:opacity-50"
                  >
                    {b === "regen" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regen
                  </button>
                  <button
                    onClick={() => markReviewed(it)}
                    disabled={!!b}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {b === "review" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Mark reviewed
                  </button>
                  <button
                    onClick={() => dismiss(it)}
                    className="inline-flex items-center gap-1 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/course/${courseId}/content/lesson/${it.lessonId}?k=${it.kind}`}
                    className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Open →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
