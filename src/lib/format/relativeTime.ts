// Compact relative time formatter — "2 minutes ago" / "3 hours ago" / "yesterday".
// Used everywhere a static datetime would be uninformative.
//
// Rules:
//   <  60s    → "just now"
//   <  60m    → "{n} minute{s} ago"
//   <  24h    → "{n} hour{s} ago"
//   <  7d     → "{n} day{s} ago"  (with "yesterday" special case)
//   else      → locale date string ("Mar 14")
//
// For dates IN THE FUTURE (e.g. "due in 2d") we mirror the rules with
// "in" prefix.

export function relativeTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const t = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(t.getTime())) return "";
  const now = Date.now();
  const diffMs = now - t.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const sec = Math.floor(abs / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  let out: string;
  if (sec < 45) out = "just now";
  else if (min < 60) out = `${min} minute${min === 1 ? "" : "s"}`;
  else if (hr < 24)  out = `${hr} hour${hr === 1 ? "" : "s"}`;
  else if (day === 1) out = future ? "tomorrow" : "yesterday";
  else if (day < 7)  out = `${day} day${day === 1 ? "" : "s"}`;
  else if (day < 30) {
    const w = Math.floor(day / 7);
    out = `${w} week${w === 1 ? "" : "s"}`;
  } else if (day < 365) {
    const m = Math.floor(day / 30);
    out = `${m} month${m === 1 ? "" : "s"}`;
  } else {
    return t.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  if (out === "just now" || out === "yesterday" || out === "tomorrow") return out;
  return future ? `in ${out}` : `${out} ago`;
}

// Absolute, short date — "Mar 14, 10:42 PM"
export function shortDateTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const t = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
