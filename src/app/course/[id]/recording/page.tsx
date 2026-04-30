// src/app/course/[id]/recording/page.tsx — recording dashboard.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function RecordingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [{ data: videos }, { data: recordings }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, duration_minutes, lesson_id, lessons!inner(title)")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase.from("recordings").select("*").eq("course_id", id),
  ]);

  const recByVideo: Record<string, { type: string; status: string; duration_seconds?: number }> = {};
  (recordings || []).forEach(
    (r) =>
      (recByVideo[r.video_id] = {
        type: r.recording_type,
        status: r.status,
        duration_seconds: r.duration_seconds,
      })
  );

  const recorded = (videos || []).filter((v) => recByVideo[v.id]?.status === "ready").length;
  const total = (videos || []).length;
  const pct = total ? Math.round((recorded / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-6 items-center">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Recording progress</div>
          <div className="text-2xl font-bold mt-1">
            {recorded}<span className="text-sm text-slate-500"> / {total}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{pct}% complete</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Lesson / Video</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(videos || []).map((v) => {
              const r = recByVideo[v.id];
              const lesson = (v as { lessons?: { title?: string } }).lessons;
              return (
                <tr key={v.id}>
                  <td className="px-4 py-2">
                    <div className="text-xs text-slate-500">{lesson?.title}</div>
                    <div>{v.title}</div>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-600">{r?.type ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={pillForStatus(r?.status ?? "pending")}>
                      {r?.status ?? "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-600">
                    {r?.duration_seconds
                      ? `${Math.round(r.duration_seconds / 60)}m`
                      : `${v.duration_minutes ?? "?"}m planned`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pillForStatus(s: string) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    scheduled: "bg-blue-50 text-blue-700",
    recording: "bg-orange-50 text-orange-700",
    uploaded: "bg-purple-50 text-purple-700",
    processing: "bg-cyan-50 text-cyan-700",
    ready: "bg-emerald-50 text-emerald-700",
  };
  return `text-xs px-2 py-0.5 rounded ${map[s] || "bg-slate-100 text-slate-600"}`;
}
