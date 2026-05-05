"use client";

// Suggestions rail.
//
// Pulls /api/lint/content findings for the active content item, renders them
// grouped by severity, and offers a one-click "Apply fix" that pipes the
// rule's fix_prompt through /api/content/[id]/ai-edit. The Accept-diff flow
// in AiEditPanel handles the rest — this rail just kicks it off.

import { useEffect, useState } from "react";
import { AlertTriangle, AlertCircle, Info, Loader2, Sparkles } from "lucide-react";

interface Finding {
  rule_id: string;
  severity: "critical" | "major" | "minor";
  message: string;
  fix_prompt: string;
}

const SEV_ICON = {
  critical: AlertCircle,
  major:    AlertTriangle,
  minor:    Info,
};
const SEV_TONE = {
  critical: "text-red-600 bg-red-50 border-red-100",
  major:    "text-amber-700 bg-amber-50 border-amber-100",
  minor:    "text-bi-blue-700 bg-bi-blue-50 border-bi-blue-100",
};

export function SuggestionsRail({
  contentItemId, kind, onApplied,
}: {
  contentItemId: string | null;
  kind: string;
  onApplied?: () => void;
}) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!contentItemId) { setFindings([]); return; }
    setLoading(true);
    fetch(`/api/lint/content?content_item_id=${contentItemId}`)
      .then((r) => r.ok ? r.json() : { findings: [] })
      .then((d) => setFindings(d.findings ?? []))
      .catch(() => setFindings([]))
      .finally(() => setLoading(false));
  }, [contentItemId, kind]);

  const apply = async (f: Finding) => {
    if (!contentItemId) return;
    setApplying(f.rule_id);
    try {
      const res = await fetch(`/api/content/${contentItemId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: f.fix_prompt }),
      });
      const data = await res.json();
      if (res.ok && data.next_payload) {
        const accept = await fetch(`/api/content/${contentItemId}/ai-edit`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "accept",
            prompt: data.prompt,
            diff_text: data.diff_text,
            next_payload: data.next_payload,
          }),
        });
        if (accept.ok) {
          setFindings((prev) => prev.filter((x) => x.rule_id !== f.rule_id));
          onApplied?.();
        }
      }
    } finally { setApplying(null); }
  };

  return (
    <div className="bg-white border border-bi-navy-100 rounded-[10px] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-bi-navy-100 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-navy-700 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-bi-blue-600" /> Suggestions
        </span>
        {findings.length > 0 && (
          <span className="text-[10px] text-bi-navy-500 font-medium">{findings.length} finding{findings.length === 1 ? "" : "s"}</span>
        )}
      </div>

      {!contentItemId ? (
        <p className="p-3.5 text-[12px] text-bi-navy-500 leading-relaxed">
          Generate this artifact first to see lint suggestions here.
        </p>
      ) : loading ? (
        <div className="p-3.5 text-[11.5px] text-bi-navy-500 inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Linting…
        </div>
      ) : findings.length === 0 ? (
        <p className="p-3.5 text-[12px] text-emerald-700 leading-relaxed">
          ✓ No issues found. This artifact passes pedagogy lint.
        </p>
      ) : (
        <ul className="p-2 space-y-1.5">
          {findings.map((f) => {
            const Icon = SEV_ICON[f.severity];
            return (
              <li key={f.rule_id} className={`rounded-md border p-2 ${SEV_TONE[f.severity]}`}>
                <div className="flex items-start gap-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold leading-snug">{f.message}</div>
                    <button
                      onClick={() => apply(f)}
                      disabled={applying !== null}
                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-bi-navy-200 text-[10.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50 disabled:opacity-50"
                      title={f.fix_prompt}
                    >
                      {applying === f.rule_id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                      {applying === f.rule_id ? "Applying…" : "Apply fix"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
