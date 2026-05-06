"use client";

// Compact "Project plan" glimpse card on the dashboard.
//
// Surfaces 3 things a coach should see at-a-glance every morning:
//   1. Top 3 courses at risk
//   2. "This week" — count of steps scheduled to finish in next 7 days
//   3. Bottleneck step trending across courses
// Click → /projects for the full portfolio view.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

interface Summary {
  atRisk: Array<{ id: string; title: string; slipCount: number; daysToDeadline: number | null; tight: boolean }>;
  thisWeek: number;
  bottleneckKind: string | null;
  bottleneckLabel: string | null;
  inProductionCount: number;
}

export function ProjectPlanGlimpse() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio/summary")
      .then(async (r) => (r.ok ? (await r.json()) as Summary : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Link
      href="/projects"
      className="block bg-white border border-bi-navy-100 rounded-lg overflow-hidden hover:border-bi-blue-300 transition-colors"
    >
      <header className="px-4 py-3 border-b border-bi-navy-100 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Calendar className="w-4 h-4 text-bi-blue-600" />
          <h3 className="text-[13px] font-bold text-bi-navy-900">Project plan</h3>
        </div>
        <span className="text-[11px] text-bi-blue-700 font-semibold inline-flex items-center gap-0.5">
          Open <ArrowRight className="w-3 h-3" />
        </span>
      </header>
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-slate-500 py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading project plan…
          </div>
        ) : !data ? (
          <div className="text-[12px] text-slate-500 py-2">No portfolio data yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat
                label="At risk"
                value={data.atRisk.length}
                tone={data.atRisk.length > 0 ? "rose" : "emerald"}
              />
              <Stat label="This week" value={data.thisWeek} tone="amber" />
              <Stat
                label="Bottleneck"
                value={data.bottleneckLabel ?? "—"}
                tone="purple"
                mono={false}
              />
            </div>
            {data.atRisk.length > 0 ? (
              <div className="border-t border-slate-100 pt-2.5 space-y-1">
                {data.atRisk.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-[12px]">
                    {c.slipCount > 0 && (
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                    )}
                    <span className="flex-1 truncate text-slate-800">{c.title}</span>
                    {c.slipCount > 0 ? (
                      <span className="text-rose-700 font-bold tabular-nums">{c.slipCount} slipping</span>
                    ) : (
                      <span className={`tabular-nums ${c.daysToDeadline !== null && c.daysToDeadline < 0 ? "text-rose-700 font-bold" : "text-amber-700 font-bold"}`}>
                        {c.daysToDeadline !== null && c.daysToDeadline < 0
                          ? `${Math.abs(c.daysToDeadline)}d over`
                          : `${c.daysToDeadline}d left`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : data.inProductionCount === 0 ? (
              <div className="border-t border-slate-100 pt-2.5 text-[12px] text-slate-500">
                No active courses. <span className="text-bi-blue-700 font-semibold">Create one →</span>
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-2.5 text-[12px] text-emerald-700 font-semibold">
                ✓ Every active course is on track.
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

function Stat({
  label, value, tone, mono = true,
}: {
  label: string; value: string | number;
  tone: "emerald" | "rose" | "amber" | "purple"; mono?: boolean;
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" :
    tone === "rose"    ? "text-rose-700" :
    tone === "amber"   ? "text-amber-700" :
                          "text-purple-700";
  return (
    <div>
      <div className={`${mono ? "font-mono" : "font-bold"} text-[18px] ${toneClass} tabular-nums`}>{value}</div>
      <div className="text-[10px] text-bi-navy-500 uppercase tracking-wider font-bold mt-0.5">{label}</div>
    </div>
  );
}
