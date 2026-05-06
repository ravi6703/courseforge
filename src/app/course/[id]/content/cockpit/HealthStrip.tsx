"use client";

// Single-line health strip + 4-tab pivot. Replaces the giant "0 / 84
// approved" header and the filler hint line. Tab choice persists in the
// URL via ?view=cockpit|lessons|artifacts|stale.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CONTENT_KINDS, KIND_META } from "../types";
import { VIEW_TABS, type View, type AggregateStats } from "./types";

export function HealthStrip({
  stats,
  daysToDeadline,
  view,
}: {
  stats: AggregateStats;
  daysToDeadline: number | null;
  view: View;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const pct = stats.total ? Math.round((stats.approved / stats.total) * 100) : 0;
  const inProgress = stats.draft + stats.generating + stats.in_review;
  const bottleneck = stats.bottleneckKind && KIND_META[stats.bottleneckKind as keyof typeof KIND_META]
    ? KIND_META[stats.bottleneckKind as keyof typeof KIND_META].label
    : null;

  const setView = (next: View) => {
    const p = new URLSearchParams(sp.toString());
    p.set("view", next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const deadlineTone =
    daysToDeadline === null ? "text-slate-500" :
    daysToDeadline < 0 ? "text-rose-700 font-bold" :
    daysToDeadline < 7 ? "text-amber-700 font-bold" :
    "text-emerald-700";

  const deadlineLabel =
    daysToDeadline === null ? "no deadline set" :
    daysToDeadline < 0 ? `${Math.abs(daysToDeadline)}d over deadline` :
    `${daysToDeadline}d to deadline`;

  // Use CONTENT_KINDS to keep import alive
  void CONTENT_KINDS;

  return (
    <div className="space-y-2">
      {/* Single-line health strip */}
      <div className="bg-white border border-bi-navy-100 rounded-lg px-4 py-2.5 flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[12.5px]">
        <Stat label="Complete" value={`${pct}%`} tone="emerald" />
        <Sep />
        <Stat label="In progress" value={inProgress} tone="amber" />
        <Sep />
        <Stat label="Stale" value={stats.stale} tone={stats.stale > 0 ? "rose" : "slate"} />
        <Sep />
        <Stat
          label="Bottleneck"
          value={bottleneck ?? "—"}
          tone="purple"
          mono={false}
        />
        <Sep />
        <span className={`font-mono tabular-nums ${deadlineTone}`}>{deadlineLabel}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-28 h-1.5 rounded-full bg-bi-navy-100 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Tab pivot */}
      <div className="flex items-center gap-0.5 border-b border-slate-200">
        {VIEW_TABS.map((t) => {
          const isActive = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-3 py-2 text-[12.5px] font-semibold border-b-2 transition-colors ${
                isActive
                  ? "border-bi-blue-600 text-bi-blue-700"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
              title={t.sub}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label, value, tone, mono = true,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "amber" | "rose" | "slate" | "purple";
  mono?: boolean;
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" :
    tone === "amber"   ? "text-amber-700" :
    tone === "rose"    ? "text-rose-700" :
    tone === "purple"  ? "text-purple-700" :
                          "text-slate-500";
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[10.5px] uppercase tracking-wider text-slate-500 font-bold">{label}</span>
      <span className={`${mono ? "font-mono" : "font-semibold"} ${toneClass} text-[13px]`}>{value}</span>
    </span>
  );
}

function Sep() {
  return <span className="w-[3px] h-[3px] bg-slate-300 rounded-full inline-block" aria-hidden />;
}
