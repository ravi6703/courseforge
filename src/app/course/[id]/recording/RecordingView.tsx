"use client";

// Recording phase — client UX with three input paths:
//   1. Direct upload (.mp4 / .m4a / .wav) per video row
//   2. Pull from Zoom inbox (recordings auto-imported by the webhook)
//   3. Zoom OAuth connect button (only shown when no creds yet)
//
// On successful upload we kick off /api/transcribe in the background so
// the Transcript tab populates without coach action.

import { useState } from "react";
import { Upload, Video, CheckCircle2, AlertCircle, Loader2, Link2, ExternalLink } from "lucide-react";

export interface RecordingRow {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  durationMinutesPlanned: number | null;
  recording: {
    id: string;
    type: string;
    status: string;
    durationSeconds: number | null;
  } | null;
}

export interface InboxItem {
  id: string;
  path: string;
  type: string;
  durationSeconds: number | null;
  createdAt: string;
}

export function RecordingView({
  courseId, courseHref, rows, waitingOnSlides, totalVideos,
  zoomConnected, inboxCount, inbox,
}: {
  courseId: string;
  courseHref: string;
  rows: RecordingRow[];
  waitingOnSlides: number;
  totalVideos: number;
  zoomConnected: boolean;
  inboxCount: number;
  inbox: InboxItem[];
}) {
  const [localRows, setLocalRows] = useState(rows);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showInbox, setShowInbox] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const recorded = localRows.filter((r) => r.recording?.status === "ready" || r.recording?.status === "uploaded").length;
  const total = localRows.length;
  const pct = total ? Math.round((recorded / total) * 100) : 0;

  const handleUpload = async (row: RecordingRow, file: File) => {
    setUploading((u) => ({ ...u, [row.videoId]: true }));
    setErrors((e) => { const { [row.videoId]: _drop, ...rest } = e; void _drop; return rest; });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("videoId", row.videoId);
      fd.append("courseId", courseId);
      const res = await fetch("/api/upload/recording", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErrors((er) => ({ ...er, [row.videoId]: data.error || `HTTP ${res.status}` }));
      } else {
        setLocalRows((rs) => rs.map((rr) => rr.videoId === row.videoId ? {
          ...rr, recording: { id: data.recording_id, type: "upload", status: "uploaded", durationSeconds: null },
        } : rr));
      }
    } catch (e) {
      setErrors((er) => ({ ...er, [row.videoId]: (e as Error).message }));
    }
    setUploading((u) => ({ ...u, [row.videoId]: false }));
  };

  const linkInboxRecording = async (recordingId: string, videoId: string) => {
    setLinkingId(recordingId);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, video_id: videoId }),
      });
      if (res.ok) {
        // Reload to refresh both rows and inbox; simpler than fully optimistic state
        window.location.reload();
      }
    } catch { /* swallow */ }
    setLinkingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Slide gating banner */}
      {waitingOnSlides > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            <span className="font-semibold">{waitingOnSlides} of {totalVideos}</span> videos have no slides yet — generate slides before recording so the coach has the deck to work from.
          </div>
          <a href={`${courseHref}/ppts`} className="text-sm text-amber-900 hover:underline font-medium shrink-0">
            Go to Presentations →
          </a>
        </div>
      )}

      {/* Header: progress + Zoom connect/inbox */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-6 items-center flex-wrap">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Recording progress</div>
          <div className="text-2xl font-bold mt-1">
            {recorded}<span className="text-sm text-slate-500"> / {total}</span>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{pct}% complete</div>
        </div>

        {zoomConnected ? (
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Zoom connected
            </span>
            {inboxCount > 0 && (
              <button
                onClick={() => setShowInbox((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 inline-flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                {inboxCount} Zoom recording{inboxCount === 1 ? "" : "s"} in inbox
              </button>
            )}
          </div>
        ) : (
          <a
            href="/api/zoom/auth/start"
            className="text-xs px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
            title="Connect a Zoom account so recordings auto-import"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Connect Zoom
          </a>
        )}
      </div>

      {/* Zoom inbox panel — collapsible */}
      {showInbox && inbox.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/30">
          <header className="px-4 py-2 border-b border-purple-200 text-sm font-semibold text-purple-900">
            Zoom inbox — link each recording to a video
          </header>
          <ul className="divide-y divide-purple-100 text-sm">
            {inbox.map((it) => (
              <li key={it.id} className="px-4 py-2.5 flex items-center gap-3">
                <Video className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-900 truncate">{it.path.split("/").pop()}</div>
                  <div className="text-xs text-slate-500">
                    {it.type} · {it.durationSeconds ? `${Math.round(it.durationSeconds / 60)}m` : "—"} · {new Date(it.createdAt).toLocaleString()}
                  </div>
                </div>
                <select
                  className="text-xs border border-purple-200 rounded-md px-2 py-1 bg-white"
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) linkInboxRecording(it.id, e.target.value); }}
                  disabled={linkingId === it.id}
                >
                  <option value="">{linkingId === it.id ? "Linking…" : "Link to video…"}</option>
                  {localRows.map((r) => (
                    <option key={r.videoId} value={r.videoId}>{r.lessonTitle} → {r.videoTitle}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-video table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Lesson / Video</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Duration</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {localRows.map((row) => {
              const r = row.recording;
              const isUploading = uploading[row.videoId];
              const err = errors[row.videoId];
              return (
                <tr key={row.videoId} className="hover:bg-slate-50/40">
                  <td className="px-4 py-2 align-top">
                    <div className="text-xs text-slate-500 truncate">{row.lessonTitle}</div>
                    <div className="text-slate-900">{row.videoTitle}</div>
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-slate-600">{r?.type ?? "—"}</td>
                  <td className="px-4 py-2 align-top">
                    {err ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600" title={err}>
                        <AlertCircle className="w-3.5 h-3.5" /> error
                      </span>
                    ) : isUploading ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> uploading
                      </span>
                    ) : (
                      <StatusPill status={r?.status ?? "pending"} />
                    )}
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-slate-600">
                    {r?.durationSeconds
                      ? `${Math.round(r.durationSeconds / 60)}m`
                      : `${row.durationMinutesPlanned ?? "?"}m planned`}
                  </td>
                  <td className="px-4 py-2 text-right align-top">
                    <div className="inline-flex gap-1">
                      <label className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer inline-flex items-center gap-1">
                        <Upload className="w-3 h-3" /> {r ? "Replace" : "Upload"}
                        <input
                          type="file"
                          accept="audio/mp4,audio/mpeg,audio/m4a,audio/wav,video/mp4,video/quicktime,video/webm"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(row, f);
                            e.target.value = ""; // allow re-upload of the same file
                          }}
                        />
                      </label>
                      {zoomConnected && (
                        <button
                          onClick={() => setShowInbox(true)}
                          className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 inline-flex items-center gap-1"
                          title="Link from Zoom inbox"
                          disabled={inboxCount === 0}
                        >
                          <Link2 className="w-3 h-3" /> Zoom
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {localRows.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {totalVideos === 0
              ? "No videos yet — generate a TOC first."
              : `No videos have slides yet. Generate slides on the Presentations tab to start recording (${totalVideos} videos waiting).`}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    scheduled: "bg-blue-50 text-blue-700",
    recording: "bg-orange-50 text-orange-700",
    uploaded: "bg-purple-50 text-purple-700",
    processing: "bg-cyan-50 text-cyan-700",
    ready: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[status] || map.pending}`}>{status}</span>;
}
