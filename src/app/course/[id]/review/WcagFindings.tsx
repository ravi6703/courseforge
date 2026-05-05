"use client";

// WCAG AA findings panel for the Final Review tab. Sits next to the
// existing audit + checklist; soft-warns only, doesn't block publish.

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Info, Loader2, ShieldAlert } from "lucide-react";

interface Finding {
  rule_id: string;
  level: "A" | "AA" | "AAA";
  severity: "error" | "warning" | "info";
  message: string;
  fix_hint?: string;
  scope: string;
}

const SEV_TONE = {
  error:   { Icon: AlertCircle,     cls: "border-red-200 bg-red-50 text-red-800" },
  warning: { Icon: AlertTriangle,   cls: "border-amber-200 bg-amber-50 text-amber-900" },
  info:    { Icon: Info,            cls: "border-bi-blue-100 bg-bi-blue-50 text-bi-blue-900" },
};

export function WcagFindings({ courseId }: { courseId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetch(`/api/audit/${courseId}/wcag`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setFindings(d?.findings ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [courseId]);

  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <header className="px-5 py-3.5 border-b border-bi-navy-100 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-bi-navy-700" />
            Accessibility (WCAG AA)
          </h2>
          <div className="text-[12px] text-bi-navy-500 mt-0.5">
            {loading ? "Scanning…" :
              findings.length === 0 ? "No accessibility issues detected" :
              `${findings.length} finding${findings.length === 1 ? "" : "s"}`
            }
          </div>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-md border border-bi-navy-100 text-[12px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
        >
          Re-scan
        </button>
      </header>

      <div className="p-3">
        {loading ? (
          <div className="px-3 py-2 text-[12px] text-bi-navy-500 inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Running checks…
          </div>
        ) : findings.length === 0 ? (
          <div className="px-3 py-4 text-[13px] text-emerald-700">
            ✓ All checks passed (alt text, headings, link text, brand contrast, captions/transcripts).
          </div>
        ) : (
          <ul className="space-y-1.5">
            {findings.map((f, i) => {
              const t = SEV_TONE[f.severity];
              const Icon = t.Icon;
              return (
                <li key={`${f.rule_id}-${i}`} className={`rounded-md border ${t.cls} p-2.5 flex items-start gap-2`}>
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold leading-snug">{f.message}</div>
                    {f.fix_hint && <div className="text-[11.5px] text-bi-navy-700 mt-0.5">{f.fix_hint}</div>}
                    <div className="text-[10.5px] text-bi-navy-500 mt-0.5">
                      WCAG {f.level} · {f.rule_id} · {f.scope}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
