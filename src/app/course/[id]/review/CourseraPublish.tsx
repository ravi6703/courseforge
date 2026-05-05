"use client";

// Coursera publish panel — for now a "package and download" flow because
// we don't have Coursera partnership credentials. When OAuth is added,
// this surface stays the same; only the underlying POST changes.

import { useEffect, useState } from "react";
import { Loader2, Download, ExternalLink, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PublishRecord {
  id: string;
  status: string;
  zip_url: string;
  created_at: string;
}

export function CourseraPublish({ courseId }: { courseId: string }) {
  const [history, setHistory] = useState<PublishRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.from("coursera_publishes")
      .select("id, status, zip_url, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data as PublishRecord[]) ?? []));
  }, [courseId]);

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/export/coursera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `HTTP ${res.status}`); return; }
      // Trigger the zip download immediately.
      window.open(data.download_url, "_blank");
      setHistory((h) => [{
        id: data.publish.id,
        status: data.publish.status,
        zip_url: data.publish.zip_url,
        created_at: data.publish.created_at,
      }, ...h]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <header className="px-5 py-3.5 border-b border-bi-navy-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-bi-navy-900 tracking-tight">Publish to Coursera</h2>
          <p className="text-[12px] text-bi-navy-500 mt-0.5">
            Packages your course as a Coursera-ready .zip. Upload via Coursera Course Builder → Import.
          </p>
        </div>
        <button
          onClick={publish}
          disabled={busy}
          className="px-3.5 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {busy ? "Packaging…" : "Package & download"}
        </button>
      </header>

      {error && <div className="mx-5 my-3 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>}

      <div className="px-5 py-3 text-[11.5px] text-bi-navy-500 border-b border-bi-navy-100">
        <span className="font-semibold text-bi-navy-700">Note: </span>
        Direct upload via the Coursera API is gated on partnership credentials we don&apos;t have yet.
        For now, every package is a one-click manual import. The publish history below is preserved
        so you can re-download earlier builds.
      </div>

      <ul className="divide-y divide-bi-navy-100">
        {history.length === 0 ? (
          <li className="px-5 py-6 text-[12.5px] text-bi-navy-500 italic">No publishes yet.</li>
        ) : history.map((p) => (
          <li key={p.id} className="px-5 py-2.5 flex items-center gap-3">
            <Clock className="w-3.5 h-3.5 text-bi-navy-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-bi-navy-900 font-medium">
                {new Date(p.created_at).toLocaleString()}
              </div>
              <div className="text-[11px] text-bi-navy-500">Status: {p.status}</div>
            </div>
            <a
              href={p.zip_url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-bi-blue-700 hover:underline inline-flex items-center gap-0.5"
            >
              <ExternalLink className="w-3 h-3" /> Re-download
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
