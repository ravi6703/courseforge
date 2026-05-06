"use client";

// Coach capacity widget — shows hours/week per coach across the org so
// the planner respects real availability, not just per-course math.

import { useEffect, useState } from "react";
import { Loader2, Users, Save } from "lucide-react";

interface Coach {
  id: string;
  name: string;
  email: string;
  capacity: { hours_per_week: number; effective_from: string | null; notes: string | null };
}

export function CapacityWidget() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coach-capacity")
      .then((r) => r.json())
      .then((j) => setCoaches(j.coaches ?? []))
      .finally(() => setLoading(false));
  }, []);

  const save = async (coachId: string) => {
    const hours = drafts[coachId];
    if (typeof hours !== "number") return;
    setSavingFor(coachId);
    try {
      await fetch("/api/coach-capacity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: coachId, hours_per_week: hours }),
      });
      setCoaches((cs) => cs.map((c) => c.id === coachId ? { ...c, capacity: { ...c.capacity, hours_per_week: hours } } : c));
    } finally { setSavingFor(null); }
  };

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="px-4 py-2.5 cursor-pointer list-none flex items-center gap-2 hover:bg-slate-50">
        <Users className="w-4 h-4 text-bi-blue-600" />
        <div className="flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Coach capacity</div>
          <div className="text-[13px] font-bold text-slate-900">Set hours/week per coach across the org</div>
        </div>
        <span className="text-[11px] text-slate-500">{coaches.length} coach{coaches.length === 1 ? "" : "es"}</span>
      </summary>
      <div className="px-4 py-3 border-t border-slate-200">
        {loading ? (
          <div className="flex items-center gap-2 text-[12.5px] text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading capacity…</div>
        ) : coaches.length === 0 ? (
          <div className="text-[12.5px] text-slate-500 italic">No coaches in this org yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {coaches.map((c) => {
              const draft = drafts[c.id] ?? c.capacity.hours_per_week;
              const dirty = drafts[c.id] !== undefined && drafts[c.id] !== c.capacity.hours_per_week;
              return (
                <li key={c.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-900 truncate">{c.name}</div>
                    <div className="text-[10.5px] text-slate-500 truncate">{c.email}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={0} max={80}
                      value={draft}
                      onChange={(e) => setDrafts({ ...drafts, [c.id]: Number(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-slate-200 rounded text-[12.5px] text-right tabular-nums"
                    />
                    <span className="text-[10.5px] text-slate-500">hr/wk</span>
                    {dirty && (
                      <button
                        onClick={() => save(c.id)}
                        disabled={savingFor === c.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bi-blue-600 text-white text-[10.5px] font-bold hover:bg-bi-blue-700 disabled:opacity-50"
                      >
                        {savingFor === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-slate-500 mt-2">
          Capacity is consulted by the planner to flag over-allocation across courses. (Cross-course load balancing coming next.)
        </p>
      </div>
    </details>
  );
}
