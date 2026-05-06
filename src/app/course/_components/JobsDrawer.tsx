"use client";

// Background generation jobs drawer — the coach sees what's queued and
// can trigger runs manually. (A real worker would advance jobs without
// human poking, but this gives full visibility + a manual escape hatch.)

import { useEffect, useState } from "react";
import { Loader2, ListTodo, Play, CheckCircle2, AlertTriangle, X } from "lucide-react";

interface Job {
  id: string;
  kind: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  payload: Record<string, unknown>;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

export function JobsDrawer({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState<Set<string>>(new Set());

  const load = async () => {
    const r = await fetch(`/api/jobs?course=${courseId}`);
    if (r.ok) {
      const j = await r.json();
      setJobs(j.jobs ?? []);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [open, courseId]);

  const queued = jobs.filter((j) => j.status === "queued");
  const runOne = async (id: string) => {
    setRunning((r) => new Set([...r, id]));
    try {
      await fetch(`/api/jobs/${id}/run`, { method: "POST" });
      await load();
    } finally {
      setRunning((r) => { const n = new Set(r); n.delete(id); return n; });
    }
  };
  const runAllQueued = async () => {
    for (const j of queued) await runOne(j.id);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-44 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900 text-white text-[12px] font-bold shadow-lg hover:bg-slate-800"
      >
        <ListTodo className="w-3.5 h-3.5" />
        Jobs
        {queued.length > 0 && <span className="ml-1 px-1.5 py-px rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold">{queued.length}</span>}
      </button>
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-[440px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-bi-blue-600" />
            <span className="text-[13px] font-bold text-slate-900">Generation queue</span>
            <span className="text-[10.5px] text-slate-500 ml-1">{jobs.length} total · {queued.length} queued</span>
            <button onClick={() => setOpen(false)} className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </header>
          {queued.length > 0 && (
            <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between bg-amber-50/60">
              <span className="text-[12px] text-amber-800 font-semibold">{queued.length} job{queued.length === 1 ? "" : "s"} waiting</span>
              <button
                onClick={runAllQueued}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-600 text-white text-[11.5px] font-bold hover:bg-amber-700"
              >
                <Play className="w-3 h-3" /> Run all queued
              </button>
            </div>
          )}
          <ul className="flex-1 overflow-auto divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <li className="px-4 py-8 text-center text-[12px] text-slate-500 italic">No jobs in the queue.</li>
            ) : jobs.map((j) => (
              <li key={j.id} className="px-4 py-2 flex items-center gap-3">
                <span className="shrink-0">
                  {j.status === "queued"  && <ListTodo className="w-3.5 h-3.5 text-slate-400" />}
                  {j.status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-bi-blue-600" />}
                  {j.status === "done"    && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {j.status === "error"   && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-900 truncate">{j.kind}</div>
                  <div className="text-[10.5px] text-slate-500">{new Date(j.created_at).toLocaleString()}</div>
                  {j.error && <div className="text-[10.5px] text-rose-700 truncate" title={j.error}>{j.error}</div>}
                </div>
                {j.status === "queued" && (
                  <button
                    onClick={() => runOne(j.id)}
                    disabled={running.has(j.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-[10.5px] font-bold hover:bg-amber-700 disabled:opacity-50"
                  >
                    {running.has(j.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
