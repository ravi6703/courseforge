// White stat card — BI hub pattern. Big number, small label, soft icon ring.
// Optional `href` makes the whole card a drill-through link with hover lift.
// Optional `delta` shows trajectory (e.g. "↑ 2 this week").

import Link from "next/link";
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

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "neutral" | "up" | "down";
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  /** When true, the value is rendered muted with an empty-state hint underneath. */
  empty?: boolean;
  emptyHint?: string;
}

export function KpiCard({
  label, value, delta, deltaTone = "neutral", icon: Icon, tone = "blue",
  href, empty = false, emptyHint,
}: KpiCardProps) {
  const deltaCls =
    deltaTone === "up"   ? "text-emerald-700" :
    deltaTone === "down" ? "text-red-700"     :
                           "text-slate-500";

  const card = (
    <div className={`bg-white border border-slate-200 rounded-[10px] shadow-sm p-5 flex items-start justify-between gap-3 transition-all ${
      href ? "hover:shadow-md hover:border-slate-300 hover:-translate-y-px cursor-pointer" : ""
    }`}>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-slate-500 font-medium leading-tight">{label}</div>
        <div className={`text-[30px] font-extrabold tracking-tight leading-none mt-1.5 ${empty ? "text-slate-300" : "text-slate-900"}`}>
          {value}
        </div>
        {empty && emptyHint && (
          <div className="mt-1.5 text-[11.5px] text-slate-500 leading-snug">{emptyHint}</div>
        )}
        {!empty && delta && (
          <div className={`mt-1.5 text-[11px] font-semibold ${deltaCls}`}>{delta}</div>
        )}
      </div>
      <div className={`shrink-0 w-9 h-9 rounded-full grid place-items-center ${RINGS[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );

  if (!href) return card;
  return <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-bi-blue-600 focus-visible:rounded-[10px]">{card}</Link>;
}
