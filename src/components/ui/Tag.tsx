// Pastel pill tag matching hub.boardinfinity.com vocabulary. One color
// class set per semantic role — never reach for raw Tailwind colors.

import { ReactNode } from "react";

type Tone =
  | "navy" | "blue" | "amber" | "emerald" | "violet"
  | "teal" | "red" | "orange" | "gold";

const TONES: Record<Tone, string> = {
  navy:    "bg-bi-navy-100 text-bi-navy-700",
  blue:    "bg-bi-blue-50 text-bi-blue-700",
  amber:   "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  violet:  "bg-violet-50 text-violet-700",
  teal:    "bg-teal-50 text-teal-700",
  red:     "bg-red-50 text-red-700",
  orange:  "bg-orange-50 text-orange-700",
  gold:    "bg-bi-accent-100 text-bi-accent-700",
};

export function Tag({
  tone = "navy",
  children,
  className = "",
}: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium leading-[1.4] tracking-[.01em] ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

// Priority tags — reused on tasks/queues, mirrors BI hub
export function PriorityTag({ priority }: { priority: "P0" | "P1" | "P2" | "P3" }) {
  const meta: Record<string, { tone: Tone; label: string }> = {
    P0: { tone: "red",    label: "P0 — Urgent"  },
    P1: { tone: "orange", label: "P1 — High"    },
    P2: { tone: "blue",   label: "P2 — Medium"  },
    P3: { tone: "navy",   label: "P3 — Low"     },
  };
  const { tone, label } = meta[priority];
  return <Tag tone={tone}>{label}</Tag>;
}

// Status tags driven by content_items.status
export function StatusTag({ status }: { status: "draft" | "approved" | "ready" | "missing" }) {
  if (status === "approved") return <Tag tone="emerald">Approved</Tag>;
  if (status === "draft")    return <Tag tone="amber">Draft</Tag>;
  if (status === "ready")    return <Tag tone="blue">Ready</Tag>;
  return <Tag tone="navy">Not built</Tag>;
}
