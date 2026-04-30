// src/app/course/[id]/ppts/page.tsx
//
// Presentations tab. Lists every video with its slide count, status, and
// per-video PPTX export. Server component.

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function PresentationsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data: videos }, { data: slides }, { data: uploads }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, lesson_id, status, order, lessons!inner(title, modules!inner(title, order))")
      .eq("course_id", id)
      .order("order", { ascending: true }),
    supabase
      .from("ppt_slides")
      .select("id, video_id, status")
      .eq("course_id", id),
    supabase
      .from("ppt_uploads")
      .select("id, video_id, original_filename, slide_count, status")
      .eq("course_id", id),
  ]);

  const slideCountByVideo: Record<string, { total: number; approved: number }> = {};
  (slides || []).forEach((s) => {
    const r = (slideCountByVideo[s.video_id] = slideCountByVideo[s.video_id] || {
      total: 0,
      approved: 0,
    });
    r.total++;
    if (s.status === "approved" || s.status === "finalized") r.approved++;
  });

  const uploadByVideo: Record<string, { filename: string; status: string }> = {};
  (uploads || []).forEach(
    (u) =>
      (uploadByVideo[u.video_id] = {
        filename: u.original_filename,
        status: u.status,
      })
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white">
        <header className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold">PPT Tracker</h2>
          <Link
            href={`/api/export/pptx?courseId=${id}`}
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800"
          >
            Export full course .pptx
          </Link>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Module / Lesson</th>
              <th className="text-left px-4 py-2">Video</th>
              <th className="text-left px-4 py-2">Slides</th>
              <th className="text-left px-4 py-2">Upload</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Export</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(videos || []).map((v) => {
              const sc = slideCountByVideo[v.id] || { total: 0, approved: 0 };
              const up = uploadByVideo[v.id];
              const lesson = (v as { lessons?: { title?: string; modules?: { title?: string } } }).lessons;
              return (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {lesson?.modules?.title ?? "—"} ›{" "}
                    <span className="text-slate-700">{lesson?.title ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-900">{v.title}</td>
                  <td className="px-4 py-2">
                    {sc.total > 0 ? (
                      <span>
                        <span className="font-medium">{sc.approved}</span>
                        <span className="text-slate-500"> / {sc.total} approved</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">none</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {up ? `${up.filename} · ${up.status}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusPill status={v.status} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/api/export/pptx?courseId=${id}&videoId=${v.id}`}
                      className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                    >
                      .pptx
                    </Link>
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    brief_ready: "bg-blue-50 text-blue-700",
    ppt_ready: "bg-purple-50 text-purple-700",
    recorded: "bg-orange-50 text-orange-700",
    transcribed: "bg-cyan-50 text-cyan-700",
    reviewed: "bg-emerald-50 text-emerald-700",
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{status}</span>;
}
