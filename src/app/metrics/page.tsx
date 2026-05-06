"use client";

// Metrics dashboard — re-themed onto the BI shell. Same data contract as
// before; only the chrome and primitives changed.

import { useEffect, useState } from "react";
import { BookOpen, Settings, CheckCircle2, Users, Clock, Zap } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tag } from "@/components/ui/Tag";
import { AvatarMini } from "@/components/ui/AvatarStack";

interface MetricsResponse {
  org_id: string;
  generated_at: string;
  courses: { total: number; in_production: number; published: number };
  time_to_publish: { sample_size: number; mean_days: number | null; median_days: number | null; target_days: number };
  toc_revisions: { sample_size: number; mean_per_course: number | null; target_max: number };
  coach_throughput_30d: { target_per_coach: number; per_coach: Array<{ coach_id: string; courses_30d: number }> };
  ai_health_24h: { total_requests: number; denied: number; errored: number; fallback_rate_pct: number | null; target_max_pct: number };
  // 2026-05 overhaul: per-course health snapshot (computed when present).
  course_health?: Array<{
    id: string;
    title: string;
    status: string;
    progress_pct: number;
    bottleneck: string;
    days_in_production: number;
    target_days: number | null;
    days_remaining: number | null;
    readiness_pct: number;
  }>;
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${r.status}`);
        }
        return r.json() as Promise<MetricsResponse>;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <AppShell title="Metrics">
        <h1 className="text-[24px] font-extrabold text-bi-navy-900 tracking-tight">Course production metrics</h1>
        <p className="mt-3 text-[14px] text-red-700">Failed to load metrics: {error}</p>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Metrics">
        <div className="grid place-items-center py-32">
          <div className="w-8 h-8 border-4 border-bi-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const ai = data.ai_health_24h;
  const aiOnTarget = ai.fallback_rate_pct !== null && ai.fallback_rate_pct <= ai.target_max_pct;
  const ttpOnTarget =
    data.time_to_publish.median_days !== null &&
    data.time_to_publish.median_days <= data.time_to_publish.target_days;

  return (
    <AppShell title="Metrics">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[24px] font-extrabold text-bi-navy-900 tracking-tight">Course production metrics</h1>
          <p className="text-[13px] text-bi-navy-500 mt-0.5">
            Updated {new Date(data.generated_at).toLocaleString()} · org {data.org_id.slice(0, 8)}…
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <KpiCard label="Total courses"        value={data.courses.total}                                    icon={BookOpen}     tone="blue"    />
        <KpiCard label="In production"        value={data.courses.in_production}                            icon={Settings}    tone="amber"   />
        <KpiCard label="Published"            value={data.courses.published}                                icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Coaches active (30d)" value={data.coach_throughput_30d.per_coach.length}             icon={Users}        tone="violet"  />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
        <Panel
          title="Time to publish"
          sub={`target ≤ ${data.time_to_publish.target_days} days · sample ${data.time_to_publish.sample_size}`}
          icon={Clock}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <Big value={data.time_to_publish.median_days !== null ? `${data.time_to_publish.median_days}d` : "—"} label="Median" />
            <Big value={data.time_to_publish.mean_days   !== null ? `${data.time_to_publish.mean_days}d`   : "—"} label="Mean"   />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <Tag tone={ttpOnTarget ? "emerald" : "amber"}>{ttpOnTarget ? "on target" : "watch"}</Tag>
              <span className="text-[10px] text-bi-navy-500 uppercase tracking-wider font-bold">Status</span>
            </div>
          </div>
        </Panel>

        <Panel
          title="AI fallback rate (24h)"
          sub={`target ≤ ${ai.target_max_pct}%`}
          icon={Zap}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <Big value={ai.fallback_rate_pct !== null ? `${ai.fallback_rate_pct.toFixed(1)}%` : "—"} label="Fallback" valueClass={aiOnTarget ? "text-emerald-700" : "text-red-700"} />
            <Big value={String(Math.max(0, ai.total_requests - ai.errored))} label="OK" valueClass="text-emerald-700" />
            <Big value={String(ai.errored)} label="Errors" valueClass={ai.errored > 0 ? "text-red-700" : ""} />
          </div>
        </Panel>
      </div>

      {data.course_health && data.course_health.length > 0 && (
        <Panel title="Active courses — health snapshot" sub="Velocity, bottleneck step, readiness vs target">
          <div className="-mx-5 -mb-5">
            <table className="w-full">
              <thead className="border-b border-bi-navy-100">
                <tr>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Course</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Progress</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Readiness</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Bottleneck</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Days</th>
                </tr>
              </thead>
              <tbody>
                {data.course_health.map((c) => {
                  const overdue = c.days_remaining !== null && c.days_remaining < 0;
                  const tight = c.days_remaining !== null && c.days_remaining >= 0 && c.days_remaining < 7;
                  return (
                    <tr key={c.id} className="border-b border-bi-navy-50 last:border-0 hover:bg-bi-navy-50">
                      <td className="px-5 py-3">
                        <a href={`/course/${c.id}`} className="text-[13px] font-bold text-bi-navy-900 hover:text-bi-blue-700">{c.title}</a>
                        <div className="text-[10.5px] text-bi-navy-500">{c.status.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-1.5 rounded-full bg-bi-navy-100 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-bi-blue-600 to-bi-accent-600" style={{ width: `${c.progress_pct}%` }} />
                          </div>
                          <span className="text-[11px] font-mono font-bold tabular-nums w-10 text-right">{c.progress_pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-1.5 rounded-full bg-bi-navy-100 overflow-hidden">
                            <div className={`h-full ${c.readiness_pct >= 80 ? "bg-emerald-500" : c.readiness_pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${c.readiness_pct}%` }} />
                          </div>
                          <span className="text-[11px] font-mono font-bold tabular-nums w-10 text-right">{c.readiness_pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] capitalize">
                        <span className="px-1.5 py-0.5 rounded bg-bi-navy-50 text-bi-navy-700 font-semibold">
                          {c.bottleneck.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px]">
                        <span className="text-bi-navy-700 font-mono">{c.days_in_production}d</span>
                        {c.days_remaining !== null && (
                          <span className={`ml-2 text-[10.5px] font-bold ${overdue ? "text-rose-700" : tight ? "text-amber-700" : "text-emerald-700"}`}>
                            {overdue ? `${Math.abs(c.days_remaining)}d over` : `${c.days_remaining}d left`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Coach throughput · last 30 days">
        <div className="-mx-5 -mb-5">
          <table className="w-full">
            <thead className="border-b border-bi-navy-100">
              <tr>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Coach</th>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">Courses (30d)</th>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-bi-navy-500">vs target</th>
              </tr>
            </thead>
            <tbody>
              {data.coach_throughput_30d.per_coach.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-[13px] text-bi-navy-500">No coach activity in the last 30 days.</td></tr>
              )}
              {data.coach_throughput_30d.per_coach.map((c) => {
                const onTarget = c.courses_30d >= data.coach_throughput_30d.target_per_coach;
                return (
                  <tr key={c.coach_id} className="border-b border-bi-navy-50 last:border-0 hover:bg-bi-navy-50">
                    <td className="px-5 py-3 text-[13px]">
                      <span className="inline-flex items-center gap-2">
                        <AvatarMini name={c.coach_id.slice(0,2)} variant={(c.coach_id.charCodeAt(0) % 2) === 0 ? "a" : "b"} />
                        <span className="font-semibold text-bi-navy-900 font-mono text-[12px]">{c.coach_id.slice(0,8)}…</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-bold text-bi-navy-900 tabular-nums">{c.courses_30d}</td>
                    <td className="px-5 py-3"><Tag tone={onTarget ? "emerald" : "amber"}>{onTarget ? "on target" : "below target"}</Tag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

function Panel({
  title, sub, icon: Icon, children,
}: { title: string; sub?: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-bi-navy-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight">{title}</h2>
          {sub && <div className="text-[12px] text-bi-navy-500 mt-0.5">{sub}</div>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-bi-navy-400 shrink-0" />}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Big({ value, label, valueClass = "text-bi-navy-900" }: { value: string; label: string; valueClass?: string }) {
  return (
    <div>
      <div className={`text-[28px] font-extrabold tracking-tight leading-none ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-bi-navy-500 uppercase tracking-[.04em] font-bold mt-1">{label}</div>
    </div>
  );
}
