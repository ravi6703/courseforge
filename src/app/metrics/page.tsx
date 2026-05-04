"use client";

// Metrics dashboard — re-themed onto the BI shell. Same data contract as
// before; only the chrome and primitives changed.

import { useEffect, useState } from "react";
import { BookOpen, Settings, CheckCircle2, Users, Clock, Zap } from "lucide-react";
import { relativeTime } from "@/lib/format/relativeTime";
import { AppShell } from "@/components/shell/AppShell";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tag } from "@/components/ui/Tag";
import { AvatarMini } from "@/components/ui/AvatarStack";
import { KpiStripSkeleton, PanelSkeleton } from "@/components/ui/SkeletonShapes";
import { ActivityFeed } from "@/components/ui/ActivityFeed";

interface MetricsResponse {
  org_id: string;
  generated_at: string;
  courses: { total: number; in_production: number; published: number };
  time_to_publish: { sample_size: number; mean_days: number | null; median_days: number | null; target_days: number };
  toc_revisions: { sample_size: number; mean_per_course: number | null; target_max: number };
  coach_throughput_30d: { target_per_coach: number; per_coach: Array<{ coach_id: string; courses_30d: number }> };
  ai_health_24h: { total_requests: number; denied: number; errored: number; fallback_rate_pct: number | null; target_max_pct: number };
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
        <h1 className="text-[24px] font-extrabold text-slate-900 tracking-tight">Course production metrics</h1>
        <p className="mt-3 text-[14px] text-red-700">Failed to load metrics: {error}</p>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Metrics">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="h-7 w-72 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-36 bg-slate-100 rounded animate-pulse mt-2" />
          </div>
        </div>
        <KpiStripSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
          <PanelSkeleton /><PanelSkeleton />
        </div>
        <PanelSkeleton rows={4} />
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
          <h1 className="text-[24px] font-extrabold text-slate-900 tracking-tight">Course production metrics</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Updated {relativeTime(data.generated_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <KpiCard
          label="Total courses"
          value={data.courses.total}
          icon={BookOpen}
          tone="blue"
          href="/dashboard"
          empty={data.courses.total === 0}
          emptyHint={data.courses.total === 0 ? "Create your first course." : undefined}
        />
        <KpiCard
          label="In production"
          value={data.courses.in_production}
          icon={Settings}
          tone="amber"
          href="/dashboard?status=inProduction"
          empty={data.courses.in_production === 0}
          emptyHint={data.courses.in_production === 0 ? "Promote a TOC to start production." : undefined}
        />
        <KpiCard
          label="Published"
          value={data.courses.published}
          icon={CheckCircle2}
          tone="emerald"
          href="/dashboard?status=published"
          delta={data.courses.published > 0 ? `${Math.round((data.courses.published / Math.max(1, data.courses.total)) * 100)}% of total` : undefined}
          empty={data.courses.published === 0}
          emptyHint={data.courses.published === 0 ? "Ship your first course →" : undefined}
        />
        <KpiCard
          label="Coaches active (30d)"
          value={data.coach_throughput_30d.per_coach.length}
          icon={Users}
          tone="violet"
          empty={data.coach_throughput_30d.per_coach.length === 0}
          emptyHint={data.coach_throughput_30d.per_coach.length === 0 ? "Invite a coach to fill this." : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
        <Panel
          title="Time to publish"
          sub={`target ≤ ${data.time_to_publish.target_days} days · sample ${data.time_to_publish.sample_size}`}
          icon={Clock}
        >
          {data.time_to_publish.sample_size < 3 ? (
            <PanelEmpty
              title="Not enough data yet"
              body={`Time-to-publish appears once ≥ 3 courses are published (sample is ${data.time_to_publish.sample_size}).`}
              cta={{ label: "Open dashboard", href: "/dashboard" }}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Big value={`${data.time_to_publish.median_days}d`} label="Median" />
              <Big value={`${data.time_to_publish.mean_days}d`}   label="Mean"   />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Tag tone={ttpOnTarget ? "emerald" : "amber"}>
                  {ttpOnTarget ? "on target" : "above target"}
                </Tag>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Status</span>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="AI fallback rate (24h)"
          sub={`target ≤ ${ai.target_max_pct}%`}
          icon={Zap}
        >
          {ai.total_requests === 0 ? (
            <PanelEmpty
              title="No AI calls in the last 24 hours"
              body="Fallback rate is computed from real traffic. Generate a TOC, brief, or content artifact to populate this panel."
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Big value={ai.fallback_rate_pct !== null ? `${ai.fallback_rate_pct.toFixed(1)}%` : "0%"} label="Fallback" valueClass={aiOnTarget ? "text-emerald-700" : "text-red-700"} />
              <Big value={String(Math.max(0, ai.total_requests - ai.errored))} label="OK" valueClass="text-emerald-700" />
              <Big value={String(ai.errored)} label="Errors" valueClass={ai.errored > 0 ? "text-red-700" : "text-slate-700"} />
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Coach throughput · last 30 days">
        <div className="-mx-5 -mb-5">
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-slate-500">Coach</th>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-slate-500">Courses (30d)</th>
                <th className="text-left px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[.04em] text-slate-500">vs target</th>
              </tr>
            </thead>
            <tbody>
              {data.coach_throughput_30d.per_coach.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10">
                  <div className="text-center max-w-sm mx-auto">
                    <div className="text-[14px] font-semibold text-slate-900">No coach activity in the last 30 days</div>
                    <div className="text-[12.5px] text-slate-500 mt-1">Throughput appears once a coach finalizes content on at least one course.</div>
                    <a href="/create" className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bi-navy-900 text-white text-[12.5px] font-semibold hover:bg-bi-navy-800">
                      Start a course
                    </a>
                  </div>
                </td></tr>
              )}
              {data.coach_throughput_30d.per_coach.map((c) => {
                const onTarget = c.courses_30d >= data.coach_throughput_30d.target_per_coach;
                return (
                  <tr key={c.coach_id} className="border-b border-bi-navy-50 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 text-[13px]">
                      <span className="inline-flex items-center gap-2">
                        <AvatarMini name={c.coach_id.slice(0,2)} variant={(c.coach_id.charCodeAt(0) % 2) === 0 ? "a" : "b"} />
                        <span className="font-semibold text-slate-900 font-mono text-[12px]">{c.coach_id.slice(0,8)}…</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-bold text-slate-900 tabular-nums">{c.courses_30d}</td>
                    <td className="px-5 py-3"><Tag tone={onTarget ? "emerald" : "amber"}>{onTarget ? "on target" : "below target"}</Tag></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-5"><ActivityFeed limit={15} /></div>
    </AppShell>
  );
}

function Panel({
  title, sub, icon: Icon, children,
}: { title: string; sub?: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h2>
          {sub && <div className="text-[12px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Big({ value, label, valueClass = "text-slate-900" }: { value: string; label: string; valueClass?: string }) {
  return (
    <div>
      <div className={`text-[28px] font-extrabold tracking-tight leading-none ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-[.04em] font-bold mt-1">{label}</div>
    </div>
  );
}

function PanelEmpty({ title, body, cta }: { title: string; body: string; cta?: { label: string; href: string } }) {
  return (
    <div className="text-center py-3">
      <div className="text-[14px] font-semibold text-slate-900">{title}</div>
      <div className="text-[12.5px] text-slate-500 mt-1 max-w-sm mx-auto">{body}</div>
      {cta && (
        <a href={cta.href} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bi-navy-900 text-white text-[12px] font-semibold hover:bg-bi-navy-800">
          {cta.label}
        </a>
      )}
    </div>
  );
}
