// Unified status pill — visual language for state across the whole app.
//
// Per coach feedback: filter pills like "All / Pending / Draft / Approved"
// must read clearly through color and border, not text alone. Same goes
// for stale-flag pills, error badges, and any status surface.
//
// Pick a variant; we render a consistent border + tinted background +
// matching text color combination tuned for the soothing palette so the
// states are scannable at a glance.

type Variant =
  | "neutral"      // counters, "All", inactive filter
  | "pending"      // missing / not yet started → amber
  | "draft"        // in progress → bi-blue
  | "approved"     // done → emerald
  | "stale"        // upstream changed → orange
  | "error"        // failure → rose
  | "info"         // informational → bi-navy
  | "warning";     // soft warning (yellow-amber)

type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  neutral:  "bg-slate-50 text-slate-700 border-slate-200",
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  draft:    "bg-bi-blue-50 text-bi-blue-700 border-bi-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  stale:    "bg-orange-50 text-orange-700 border-orange-200",
  error:    "bg-rose-50 text-rose-700 border-rose-200",
  info:     "bg-bi-navy-50 text-bi-navy-700 border-bi-navy-200",
  warning:  "bg-amber-50 text-amber-800 border-amber-300",
};

const ACTIVE_RING: Record<Variant, string> = {
  neutral:  "ring-2 ring-slate-300",
  pending:  "ring-2 ring-amber-300",
  draft:    "ring-2 ring-bi-blue-300",
  approved: "ring-2 ring-emerald-300",
  stale:    "ring-2 ring-orange-300",
  error:    "ring-2 ring-rose-300",
  info:     "ring-2 ring-bi-navy-300",
  warning:  "ring-2 ring-amber-400",
};

const SIZE: Record<Size, string> = {
  sm: "text-[10.5px] px-1.5 py-0.5 rounded",
  md: "text-[11.5px] px-2 py-1 rounded-md",
};

export function StatusPill({
  variant = "neutral", size = "md", count, label, active, onClick, title,
}: {
  variant?: Variant;
  size?: Size;
  count?: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const cls = `inline-flex items-center gap-1.5 font-semibold border transition-colors ${VARIANT[variant]} ${SIZE[size]} ${
    active ? ACTIVE_RING[variant] : ""
  } ${onClick ? "hover:brightness-95 cursor-pointer" : ""}`;
  const content = (
    <>
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="opacity-70 tabular-nums font-mono">{count}</span>
      )}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className={cls} title={title}>{content}</button>
  ) : (
    <span className={cls} title={title}>{content}</span>
  );
}

// Tiny dot indicator for grids that can't afford a full pill.
export function StatusDot({ variant = "neutral", title }: { variant?: Variant; title?: string }) {
  const tone =
    variant === "approved" ? "bg-emerald-400" :
    variant === "draft"    ? "bg-bi-blue-300" :
    variant === "pending"  ? "bg-amber-300"   :
    variant === "stale"    ? "bg-orange-300"  :
    variant === "error"    ? "bg-rose-400"    :
    variant === "warning"  ? "bg-amber-400"   :
    variant === "info"     ? "bg-bi-navy-300" :
                              "bg-slate-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${tone}`} title={title} />;
}
