// Quiet stat card — no colored icon tile, single-weight numerals.
// `tone` is accepted for backwards compat but the visual now reads as
// neutral so KPI strips don't compete with content for attention.

import { LucideIcon } from "lucide-react";

type Tone = "blue" | "amber" | "violet" | "emerald" | "teal" | "gold" | "red";

export function KpiCard({
  label, value, delta, deltaTone = "neutral", icon: Icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "neutral" | "up" | "down";
  icon: LucideIcon;
  tone?: Tone;
}) {
  const deltaCls =
    deltaTone === "up"   ? "text-emerald-700" :
    deltaTone === "down" ? "text-red-700"     :
                           "text-bi-navy-500";
  return (
    <div className="bg-white border border-bi-navy-100 rounded-lg p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12.5px] text-bi-navy-500 font-medium leading-tight">{label}</div>
        <div className="text-[26px] font-semibold text-bi-navy-800 tracking-tight leading-none mt-2">{value}</div>
        {delta && (
          <div className={`mt-1.5 text-[11px] font-medium ${deltaCls}`}>{delta}</div>
        )}
      </div>
      <Icon className="w-4 h-4 text-bi-navy-400 shrink-0" />
    </div>
  );
}
