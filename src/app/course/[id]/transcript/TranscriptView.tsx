"use client";

// Transcript view — shows all videos grouped by module/lesson with per-row
// generate/regenerate transcript actions.

import { useState } from "react";
import { Loader2, RotateCcw, Eye } from "lucide-react";

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
            <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-900">
              {moduleName}
            </div>

            {/* Lesson groups */}
            <div className="space-y-2 pl-2">
              {Object.entries(lessons).map(([lessonName, videos]) => (
                <div key={lessonName} className="space-y-1">
                  {/* Lesson header */}
                  <div className="px-3 py-1 text-xs font-medium text-slate-600 uppercase tracking-wider">
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
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : err
                                ? "bg-red-50 border-red-200"
                                : isTranscribing
                                ? "bg-blue-50 border-blue-200"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900">
                                  {row.videoTitle}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
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
                                      className="text-blue-600 hover:underline"
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
                                  <span className="text-xs text-slate-400">—</span>
                                ) : hasTranscript ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        setExpandedId(isExpanded ? null : row.videoId)
                                      }
                                      className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> View full
                                    </button>
                                    <button
                                      onClick={() => handleGenerateTranscript(row)}
                                      className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 inline-flex items-center gap-1"
                                    >
                                      <RotateCcw className="w-3 h-3" /> Re-generate
                                    </button>
                                  </div>
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
                              <div className="mt-3 pt-3 border-t border-slate-200">
                                <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700 bg-slate-50 rounded p-2 max-h-96 overflow-y-auto">
                                  {row.transcript!.text_content || "(loading...)"}
                                </pre>
                              </div>
                            )}

                            {/* Non-expanded preview */}
                            {!isExpanded && hasTranscript && (
                              <div className="mt-2 text-xs text-slate-600 line-clamp-2">
                                {row.transcript!.text_content.slice(0, 120)}
                                {row.transcript!.text_content.length > 120 ? "..." : ""}
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
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No videos yet. Create a course outline first.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
