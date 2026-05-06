"use client";

// Inline meta controls for a video row in the TOC: type tag + ideal
// duration. Drives downstream automation (script template, slide count,
// recording style).
//
// Coach feedback:
//   "along with video name, ideal duration of video should be there"
//   "can be tag like type of video (theory, practical, hands-on, mixed,
//    conceptual)"
//
// Both fields PATCH videos directly via /api/courses/[id]/update-item.

import { useState } from "react";
import { Loader2 } from "lucide-react";

export const VIDEO_TYPES = [
  { id: "theory",     label: "Theory",     hint: "Lecture-style explanation",        emoji: "📘" },
  { id: "conceptual", label: "Conceptual", hint: "Diagrams + thought experiments",   emoji: "🧠" },
  { id: "demo",       label: "Demo",       hint: "Watch-me-build walkthrough",       emoji: "🎬" },
  { id: "hands_on",   label: "Hands-on",   hint: "Learner does it alongside",        emoji: "🛠️" },
  { id: "exercise",   label: "Exercise",   hint: "Problem set / practice",           emoji: "📝" },
  { id: "recap",      label: "Recap",      hint: "Summary / review",                 emoji: "🔁" },
  { id: "project",    label: "Project",    hint: "Capstone / extended build",        emoji: "🏗️" },
  { id: "mixed",      label: "Mixed",      hint: "Multiple modes",                   emoji: "🎛️" },
] as const;

export type VideoTypeId = typeof VIDEO_TYPES[number]["id"];

export const DURATION_HINTS: Record<VideoTypeId, string> = {
  theory: "5–8 min",
  conceptual: "5–10 min",
  demo: "8–15 min",
  hands_on: "10–20 min",
  exercise: "5–12 min",
  recap: "3–5 min",
  project: "15–30 min",
  mixed: "8–15 min",
};

export function VideoTypeTag({
  courseId,
  videoId,
  initial,
  size = "sm",
}: {
  courseId: string;
  videoId: string;
  initial: VideoTypeId | null | undefined;
  size?: "sm" | "md";
}) {
  const [val, setVal] = useState<VideoTypeId>((initial as VideoTypeId) ?? "theory");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (next: VideoTypeId) => {
    setVal(next); setOpen(false); setBusy(true);
    try {
      await fetch(`/api/courses/${courseId}/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "videos", id: videoId, video_type: next }),
      });
    } finally { setBusy(false); }
  };

  const meta = VIDEO_TYPES.find((v) => v.id === val) ?? VIDEO_TYPES[0];
  const padCls = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11.5px]";

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded border bg-white border-slate-200 hover:border-bi-blue-300 font-semibold text-slate-700 ${padCls}`}
        title={meta.hint}
      >
        {busy ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <span>{meta.emoji}</span>}
        <span>{meta.label}</span>
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-slate-200 rounded-md shadow-lg py-1">
            {VIDEO_TYPES.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => save(t.id)}
                  className={`w-full text-left px-3 py-1.5 text-[11.5px] hover:bg-slate-50 flex items-center gap-2 ${
                    val === t.id ? "bg-slate-50 font-bold text-slate-900" : "text-slate-700"
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span className="flex-1">{t.label}</span>
                  <span className="text-[10px] text-slate-400">{DURATION_HINTS[t.id]}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function VideoDurationField({
  courseId,
  videoId,
  videoType,
  initial,
}: {
  courseId: string;
  videoId: string;
  videoType: VideoTypeId | null | undefined;
  initial: number | null | undefined;
}) {
  const [val, setVal] = useState<number | "">(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const hint = DURATION_HINTS[(videoType as VideoTypeId) ?? "theory"];

  const save = async (n: number | "") => {
    setBusy(true);
    try {
      await fetch(`/api/courses/${courseId}/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "videos",
          id: videoId,
          ideal_duration_minutes: n === "" ? null : n,
          duration_minutes: n === "" ? null : n,
        }),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally { setBusy(false); }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={120}
        value={val}
        onChange={(e) => setVal(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={() => save(val)}
        className="w-12 px-1 py-0.5 border border-slate-200 rounded text-[10.5px] text-right tabular-nums"
        placeholder={hint}
        title={`Ideal: ${hint}`}
      />
      <span className="text-[10px] text-slate-400">min</span>
      {busy && <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" />}
      {savedAt && !busy && <span className="text-[9px] text-emerald-600 font-mono">✓</span>}
    </span>
  );
}
