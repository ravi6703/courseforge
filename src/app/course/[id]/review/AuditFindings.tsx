"use client";

// Final Review — full findings list + hard publish gate.
//
// Replaces the implicit "first 3 findings" treatment with an audit panel that
// shows everything from /api/audit/[courseId], grouped by severity, each with
// a deep-link to the right stage. Publish is hard-disabled when score < 80
// or critical > 0.

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

interface AuditFinding {
  rule_id: string;
  scope: string;
  severity: "critical" | "major" | "minor";
  message: string;
  fix_prompt?: string;
  target?: { kind: string; id?: string; stage?: string };
}

interface AuditResult {
  course_id: string;
  score: number;
  critical: number;
  major: number;
  minor: number;
  ready_to_publish: boolean;
  findings: AuditFinding[];
}

const SEV_ICON = { critical: AlertCircle, major: AlertTriangle, minor: Info };
const SEV_TONE = {
  critical: "border-red-200 bg-red-50 text-red-800",
  major:    "border-amber-200 bg-amber-50 text-amber-900",
  minor:    "border-bi-blue-100 bg-bi-blue-50 text-bi-blue-900",
};

export function AuditFindings({ courseId }: { courseId: string }) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const refresh = () => {
    setLoading(true);
    fetch(`/api/audit/${courseId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setAudit(d))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [courseId]);

  if (loading || !audit) {
    return (
      <div className="bg-white border border-bi-navy-100 rounded-[10px] p-6 inline-flex items-center gap-2 text-[13px] text-bi-navy-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running audit…
      </div>
    );
  }

  const grouped = {
    critical: audit.findings.filter((f) => f.severity === "critical"),
    major:    audit.findings.filter((f) => f.severity === "major"),
    minor:    audit.findings.filter((f) => f.severity === "minor"),
  };

  const publish = async () => {
    if (!audit.ready_to_publish) return;
    setPublishing(true);
    try {
      await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      window.location.reload();
    } finally { setPublishing(false); }
  };

  const linkFor = (f: AuditFinding): string => {
    const t = f.target;
    if (!t) return `/course/${courseId}/review`;
    const stage = t.stage ?? "review";
    if (t.kind === "video" && t.id) return `/course/${courseId}/${stage}?focus=${t.id}`;
    if (t.kind === "module" && t.id) return `/course/${courseId}/toc#m-${t.id}`;
    if (t.kind === "lesson" && t.id) return `/course/${courseId}/toc#l-${t.id}`;
    return `/course/${courseId}/${stage}`;
  };

  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-bi-navy-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-bi-navy-700" />
            Course audit
          </h2>
          <div className="text-[12px] text-bi-navy-500 mt-0.5">
            Score <span className="font-bold text-bi-navy-900">{audit.score}</span> ·{" "}
            <span className="text-red-700">{audit.critical} critical</span> ·{" "}
            <span className="text-amber-700">{audit.major} major</span> ·{" "}
            <span className="text-bi-blue-700">{audit.minor} minor</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-md border border-bi-navy-100 text-[12px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
          >
            Re-run audit
          </button>
          <button
            disabled={!audit.ready_to_publish || publishing}
            onClick={publish}
            title={!audit.ready_to_publish ? "Need score ≥ 80 and zero criticals to publish" : "Publish course"}
            className="px-3.5 py-1.5 rounded-md bg-emerald-700 text-white text-[13px] font-semibold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Publish course
          </button>
        </div>
      </header>

      {audit.findings.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-emerald-700">
          ✓ Clean audit. The course is ready to publish.
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {(["critical", "major", "minor"] as const).map((sev) => {
            const items = grouped[sev];
            if (items.length === 0) return null;
            const Icon = SEV_ICON[sev];
            return (
              <div key={sev}>
                <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1.5 px-2">
                  {sev} ({items.length})
                </div>
                <ul className="space-y-1.5">
                  {items.map((f) => (
                    <li key={f.rule_id + (f.target?.id ?? "")} className={`rounded-md border ${SEV_TONE[sev]} p-2.5 flex items-start gap-2`}>
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold leading-snug">{f.message}</div>
                        <div className="text-[10.5px] text-bi-navy-500 mt-0.5">{f.rule_id}</div>
                      </div>
                      <Link
                        href={linkFor(f)}
                        className="text-[11.5px] font-semibold text-bi-blue-700 inline-flex items-center gap-0.5 hover:underline shrink-0"
                      >
                        Fix <ArrowRight className="w-3 h-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
