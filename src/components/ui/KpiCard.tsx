// White stat card with a soft pastel icon ring in the top-right corner —
// the BI hub pattern. Optional delta line below the value.

import { LucideIcon } from "lucide-react";

type Tone = "blue" | "amber" | "violet" | "emerald" | "teal" | "gold" | "red";

const RINGS: Record<Tone, string> = {
  blue:    "bg-bi-blue-50 text-bi-blue-700",
  amber:   "bg-amber-50 text-amber-700",
  violet:  "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  teal:    "bg-teal-50 text-teal-700",
  gold:    "bg-bi-accent-50 text-bi-accent-700",
  red:     "bg-red-50 text-red-700",
};

export function KpiCard({
  label, value, delta, deltaTone = "neutral", icon: Icon, tone = "blue",
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
    <div className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] text-bi-navy-500 font-medium leading-tight">{label}</div>
        <div className="text-[30px] font-extrabold text-bi-navy-900 tracking-tight leading-none mt-1.5">{value}</div>
        {delta && (
          <div className={`mt-1.5 text-[11px] font-semibold ${deltaCls}`}>{delta}</div>
        )}
      </div>
      <div className={`shrink-0 w-9 h-9 rounded-full grid place-items-center ${RINGS[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}
