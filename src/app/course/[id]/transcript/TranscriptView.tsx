"use client";

// Transcript view — shows all videos grouped by module/lesson with per-row
// generate/regenerate transcript actions.

import { useState } from "react";
import { Loader2, RotateCcw, Eye, Sparkles, BookOpen, Download, Languages, ArrowRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";

export interface TranscriptVideoRow {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  recording: {
    id: string;
    status: string;
  } | null;
  transcript: {
    id: string;
    status: string;
    word_count: number;
    text_content: string;
  } | null;
}

export function TranscriptView({
  courseId,
  rows,
}: {
  courseId: string;
  rows: TranscriptVideoRow[];
}) {
  const [localRows, setLocalRows] = useState(rows);
  const [transcribing, setTranscribing] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyUtil, setBusyUtil] = useState<{ id: string; util: "cleanup" | "glossary" | "translate" | null }>({ id: "", util: null });
  const [glossaries, setGlossaries] = useState<Record<string, Array<{ term: string; definition: string }>>>({});
  const [translations, setTranslations] = useState<Record<string, { target: string; text: string }>>({});

  const runTranslate = async (transcriptId: string) => {
    const target = window.prompt("Target language (e.g. hi, es, ar, fr, de, pt, ja, zh, ko, ru, vi, tr):", "hi");
    if (!target?.trim()) return;
    setBusyUtil({ id: transcriptId, util: "translate" });
    try {
      const res = await fetch(`/api/transcript/${transcriptId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.translation) {
        setTranslations((tx) => ({ ...tx, [transcriptId]: { target: data.target_name ?? data.target, text: data.translation } }));
      } else {
        alert(`Translation failed: ${data.error ?? `HTTP ${res.status}`}`);
      }
    } finally { setBusyUtil({ id: "", util: null }); }
  };

  const runCleanup = async (transcriptId: string) => {
    setBusyUtil({ id: transcriptId, util: "cleanup" });
    try {
      const res = await fetch(`/api/transcript/${transcriptId}/cleanup`, { method: "POST" });
      if (res.ok) location.reload();
    } finally { setBusyUtil({ id: "", util: null }); }
  };
  const runGlossary = async (transcriptId: string) => {
    setBusyUtil({ id: transcriptId, util: "glossary" });
    try {
      const res = await fetch(`/api/transcript/${transcriptId}/glossary`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setGlossaries((g) => ({ ...g, [transcriptId]: data.glossary ?? [] }));
      }
    } finally { setBusyUtil({ id: "", util: null }); }
  };
  const downloadSubtitle = (transcriptId: string, fmt: "srt" | "vtt") => {
    window.open(`/api/transcript/${transcriptId}/subtitle?format=${fmt}`, "_blank");
  };

  const handleGenerateTranscript = async (row: TranscriptVideoRow) => {
    if (!row.recording) {
      setErrors((e) => ({ ...e, [row.videoId]: "No recording available" }));
      return;
    }

    setTranscribing((t) => ({ ...t, [row.videoId]: true }));
    setErrors((e) => { const { [row.videoId]: _drop, ...rest } = e; void _drop; return rest; });

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: row.recording.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors((e) => ({ ...e, [row.videoId]: data.error || `HTTP ${res.status}` }));
        setTranscribing((t) => ({ ...t, [row.videoId]: false }));
        return;
      }

      // Update the row with the new transcript
      setLocalRows((rs) =>
        rs.map((r) =>
          r.videoId === row.videoId
            ? {
                ...r,
                transcript: {
                  id: data.transcript_id,
                  status: "ready",
                  word_count: data.text_length ? Math.floor(data.text_length / 4.7) : 0,
                  text_content: "",
                },
              }
            : r
        )
      );
    } catch (e) {
      const msg = (e instanceof Error) ? e.message : "Unknown error";
      setErrors((er) => ({ ...er, [row.videoId]: msg }));
    }

    setTranscribing((t) => ({ ...t, [row.videoId]: false }));
  };

  // Group by module -> lesson
  const grouped = localRows.reduce((acc, row) => {
    if (!acc[row.moduleTitle]) {
      acc[row.moduleTitle] = {};
    }
    if (!acc[row.moduleTitle][row.lessonTitle]) {
      acc[row.moduleTitle][row.lessonTitle] = [];
    }
    acc[row.moduleTitle][row.lessonTitle].push(row);
    return acc;
  }, {} as Record<string, Record<string, TranscriptVideoRow[]>>);

  // Count stats
  const transcriptCount = localRows.filter((r) => r.transcript?.id).length;
  const approvedCount = localRows.filter(
    (r) => r.transcript?.status === "approved"
  ).length;
  const totalWords = localRows.reduce(
    (sum, r) => sum + (r.transcript?.word_count || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Transcripts" value={String(transcriptCount)} />
        <Stat label="Approved" value={String(approvedCount)} />
        <Stat label="Words across course" value={totalWords.toLocaleString()} />
      </div>

      {/* Module sections */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([moduleName, lessons]) => (
          <div key={moduleName} className="space-y-2">
            {/* Module header */}
            <div className="px-4 py-2 bg-bi-navy-100 rounded-lg text-sm font-semibold text-bi-navy-900">
              {moduleName}
            </div>

            {/* Lesson groups */}
            <div className="space-y-2 pl-2">
              {Object.entries(lessons).map(([lessonName, videos]) => (
                <div key={lessonName} className="space-y-1">
                  {/* Lesson header */}
                  <div className="px-3 py-1 text-xs font-medium text-bi-navy-600 uppercase tracking-wider">
                    {lessonName}
                  </div>

                  {/* Video rows */}
                  <div className="space-y-1 pl-2">
                    {videos.map((row) => {
                      const hasRecording = !!row.recording;
                      const hasTranscript = !!row.transcript?.id;
                      const isTranscribing = transcribing[row.videoId];
                      const err = errors[row.videoId];
                      const isExpanded = expandedId === row.videoId;

                      return (
                        <div key={row.videoId}>
                          <div
                            className={`rounded-lg border p-3 ${
                              !hasRecording
                                ? "bg-bi-navy-50 border-bi-navy-200 opacity-60"
                                : err
                                ? "bg-red-50 border-red-200"
                                : isTranscribing
                                ? "bg-blue-50 border-blue-200"
                                : "bg-white border-bi-navy-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-bi-navy-900">
                                  {row.videoTitle}
                                </div>
                                <div className="text-xs text-bi-navy-500 mt-0.5">
                                  {hasRecording ? (
                                    hasTranscript ? (
                                      <span>
                                        {row.transcript!.word_count.toLocaleString()} words · {row.transcript!.status}
                                      </span>
                                    ) : (
                                      "Recording ready for transcription"
                                    )
                                  ) : (
                                    <a
                                      href={`/course/${courseId}/recording`}
                                      className="text-bi-blue-600 hover:underline"
                                    >
                                      Upload recording first → Recording tab
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Action column */}
                              <div className="flex items-center gap-2 shrink-0">
                                {err ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-red-600 text-right max-w-xs">
                                      {err}
                                    </span>
                                    <button
                                      onClick={() => handleGenerateTranscript(row)}
                                      disabled={isTranscribing}
                                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
                                    >
                                      <RotateCcw className="w-3 h-3" /> Retry
                                    </button>
                                  </div>
                                ) : isTranscribing ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribing…
                                  </span>
                                ) : !hasRecording ? (
                                  <span className="text-xs text-bi-navy-400">—</span>
                                ) : hasTranscript ? (
                                  <TranscriptActions
                                    courseId={courseId}
                                    videoId={row.videoId}
                                    transcriptId={row.transcript!.id}
                                    expanded={isExpanded}
                                    busyUtil={busyUtil}
                                    onView={() => setExpandedId(isExpanded ? null : row.videoId)}
                                    onCleanup={() => runCleanup(row.transcript!.id)}
                                    onGlossary={() => runGlossary(row.transcript!.id)}
                                    onTranslate={() => runTranslate(row.transcript!.id)}
                                    onDownload={(fmt) => downloadSubtitle(row.transcript!.id, fmt)}
                                    onRegenerate={() => handleGenerateTranscript(row)}
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleGenerateTranscript(row)}
                                    className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 inline-flex items-center gap-1"
                                  >
                                    Generate transcript
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expanded preview */}
                            {isExpanded && hasTranscript && (
                              <div className="mt-3 pt-3 border-t border-bi-navy-200">
                                <pre className="text-xs whitespace-pre-wrap font-mono text-bi-navy-700 bg-bi-navy-50 rounded p-2 max-h-96 overflow-y-auto">
                                  {row.transcript!.text_content || "(loading...)"}
                                </pre>
                              </div>
                            )}

                            {/* Non-expanded preview */}
                            {!isExpanded && hasTranscript && (
                              <div className="mt-2 text-xs text-bi-navy-600 line-clamp-2">
                                {row.transcript!.text_content.slice(0, 120)}
                                {row.transcript!.text_content.length > 120 ? "..." : ""}
                              </div>
                            )}

                            {/* Glossary results */}
                            {hasTranscript && glossaries[row.transcript!.id] && (
                              <div className="mt-3 pt-3 border-t border-bi-navy-200">
                                <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1.5">Glossary</div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                  {glossaries[row.transcript!.id].map((g, i) => (
                                    <li key={i} className="text-[12px] text-bi-navy-700">
                                      <span className="font-semibold text-bi-navy-900">{g.term}.</span>{" "}
                                      <span className="text-bi-navy-600">{g.definition}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Translation results */}
                            {hasTranscript && translations[row.transcript!.id] && (
                              <div className="mt-3 pt-3 border-t border-bi-navy-200">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">
                                    Translation · {translations[row.transcript!.id].target}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const blob = new Blob([translations[row.transcript!.id].text], { type: "text/plain" });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `transcript-${row.transcript!.id}-${translations[row.transcript!.id].target}.txt`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    }}
                                    className="text-[10.5px] text-bi-blue-700 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <Download className="w-2.5 h-2.5" /> .txt
                                  </button>
                                </div>
                                <pre className="text-xs whitespace-pre-wrap font-mono text-bi-navy-700 bg-bi-navy-50 rounded p-2 max-h-96 overflow-y-auto">
                                  {translations[row.transcript!.id].text}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {localRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-bi-navy-300 p-10 text-center text-sm text-bi-navy-500">
            No videos yet. Create a course outline first.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bi-navy-200 bg-white p-3">
      <div className="text-xs text-bi-navy-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-2xl font-bold text-bi-navy-900 mt-0.5">{value}</div>
    </div>
  );
}

// Per-row action group. Two primary buttons (View, Send to Content) plus
// an overflow menu for the rest. Replaces the previous 8-button row.
function TranscriptActions(props: {
  courseId: string;
  videoId: string;
  transcriptId: string;
  expanded: boolean;
  busyUtil: { id: string; util: "cleanup" | "glossary" | "translate" | null };
  onView: () => void;
  onCleanup: () => void;
  onGlossary: () => void;
  onTranslate: () => void;
  onDownload: (fmt: "srt" | "vtt") => void;
  onRegenerate: () => void;
}) {
  const { courseId, videoId, transcriptId, expanded, busyUtil,
          onView, onCleanup, onGlossary, onTranslate, onDownload, onRegenerate } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const isBusy = (k: "cleanup" | "glossary" | "translate") =>
    busyUtil.util === k && busyUtil.id === transcriptId;

  return (
    <div className="flex items-center gap-1.5 justify-end relative">
      <button
        onClick={onView}
        className="text-xs px-2 py-1 rounded border border-bi-navy-200 text-bi-navy-700 bg-white hover:bg-bi-navy-50 inline-flex items-center gap-1"
        title="View full transcript"
      >
        <Eye className="w-3 h-3" /> {expanded ? "Hide" : "View"}
      </button>
      <Link
        href={`/course/${courseId}/content/${videoId}`}
        className="text-xs px-2 py-1 rounded bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 hover:bg-bi-blue-200 inline-flex items-center gap-1 font-semibold"
        title="Open this video's content workspace"
      >
        Send to Content <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="text-bi-navy-500 hover:text-bi-navy-900 p-1.5 rounded hover:bg-bi-navy-50"
        aria-label="More actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {menuOpen && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <ul className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-white border border-bi-navy-200 rounded-md shadow-lg py-1">
            <MenuItem onClick={() => { onCleanup();   setMenuOpen(false); }} icon={isBusy("cleanup")  ? Loader2 : Sparkles}  label="Clean up" busy={isBusy("cleanup")} />
            <MenuItem onClick={() => { onGlossary();  setMenuOpen(false); }} icon={isBusy("glossary") ? Loader2 : BookOpen}  label="Extract glossary" busy={isBusy("glossary")} />
            <MenuItem onClick={() => { onTranslate(); setMenuOpen(false); }} icon={isBusy("translate")? Loader2 : Languages} label="Translate" busy={isBusy("translate")} />
            <li className="border-t border-bi-navy-100 my-1" />
            <MenuItem onClick={() => { onDownload("srt"); setMenuOpen(false); }} icon={Download} label="Download SRT" />
            <MenuItem onClick={() => { onDownload("vtt"); setMenuOpen(false); }} icon={Download} label="Download VTT" />
            <li className="border-t border-bi-navy-100 my-1" />
            <MenuItem onClick={() => { onRegenerate(); setMenuOpen(false); }} icon={RotateCcw} label="Re-generate transcript" />
          </ul>
        </>
      )}
    </div>
  );
}

function MenuItem({
  onClick, icon: Icon, label, busy,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  busy?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-bi-navy-700 hover:bg-bi-navy-50"
      >
        <Icon className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
        {label}
      </button>
    </li>
  );
}
