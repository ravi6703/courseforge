"use client";

// PROD-3 — minimal PM-only metrics dashboard. Reads /api/admin/metrics
// and renders a one-page scorecard with the four PRD success metrics.
// Designed to fit on a single 13" laptop screen so it's easy to glance at.

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";

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
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-16 p-8">
          <h1 className="text-3xl font-bold text-gray-900">Metrics</h1>
          <p className="mt-4 text-red-700">Failed to load metrics: {error}</p>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tt = data.time_to_publish;
  const rev = data.toc_revisions;
  const ai = data.ai_health_24h;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Course Production Metrics</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Updated {new Date(data.generated_at).toLocaleString()} · Org {data.org_id.slice(0, 8)}…
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="Total courses" value={data.courses.total} />
            <Stat label="In production" value={data.courses.in_production} />
            <Stat label="Published" value={data.courses.published} />
            <Stat label="Coaches active (30d)" value={data.coach_throughput_30d.per_coach.length} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreCard
              title="Time to publish"
              currentLabel={tt.median_days ? `${tt.median_days}d (median)` : "no data"}
              targetLabel={`< ${tt.target_days}d`}
              hit={tt.median_days != null && tt.median_days <= tt.target_days}
              note={tt.sample_size ? `${tt.sample_size} published course${tt.sample_size === 1 ? "" : "s"}` : "Publish a course to start measuring"}
            />
            <ScoreCard
              title="TOC revision cycles"
              currentLabel={rev.mean_per_course != null ? `${rev.mean_per_course} avg` : "no data"}
              targetLabel={`≤ ${rev.target_max}`}
              hit={rev.mean_per_course != null && rev.mean_per_course <= rev.target_max}
              note={rev.sample_size ? `Across ${rev.sample_size} published course${rev.sample_size === 1 ? "" : "s"}` : "Counts toc.improved events"}
            />
            <ScoreCard
              title="AI health (last 24h)"
              currentLabel={ai.fallback_rate_pct != null ? `${ai.fallback_rate_pct}% fallback` : "no AI calls yet"}
              targetLabel={`< ${ai.target_max_pct}%`}
              hit={ai.fallback_rate_pct == null || ai.fallback_rate_pct < ai.target_max_pct}
              note={`${ai.total_requests} total · ${ai.denied} rate-limited · ${ai.errored} errored`}
            />
            <ScoreCard
              title="Coach throughput (30d)"
              currentLabel={
                data.coach_throughput_30d.per_coach.length
                  ? `${(data.coach_throughput_30d.per_coach.reduce((s, c) => s + c.courses_30d, 0) / data.coach_throughput_30d.per_coach.length).toFixed(1)} avg`
                  : "no data"
              }
              targetLabel={`≥ ${data.coach_throughput_30d.target_per_coach} / coach`}
              hit={
                data.coach_throughput_30d.per_coach.length > 0 &&
                data.coach_throughput_30d.per_coach.every((c) => c.courses_30d >= data.coach_throughput_30d.target_per_coach)
              }
              note={`${data.coach_throughput_30d.per_coach.length} coach${data.coach_throughput_30d.per_coach.length === 1 ? "" : "es"} active`}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function ScoreCard({
  title, currentLabel, targetLabel, hit, note,
}: { title: string; currentLabel: string; targetLabel: string; hit: boolean; note: string }) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${hit ? "border-emerald-200" : "border-amber-200"}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hit ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {hit ? "On target" : "Off target"}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">{currentLabel}</span>
        <span className="text-sm text-gray-500">target {targetLabel}</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">{note}</p>
    </div>
  );
}
