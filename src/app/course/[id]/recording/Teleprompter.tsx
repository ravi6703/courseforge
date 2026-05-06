"use client";

// Browser teleprompter — auto-scrolls speaker notes for whichever video
// the coach is recording. WPM is configurable; arrow keys nudge speed.
//
// Live mic capture uses the browser MediaRecorder API; we keep the
// recorded blob in memory and the parent recording row can pick it up.

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Pause, Play, RotateCcw, X } from "lucide-react";

interface VideoForPrompter {
  id: string;
  title: string;
  speakerNotes: string;
}

export function Teleprompter({
  videos,
  initialVideoId,
  onClose,
}: {
  videos: VideoForPrompter[];
  initialVideoId?: string;
  onClose: () => void;
}) {
  const [videoId, setVideoId] = useState(initialVideoId ?? videos[0]?.id ?? null);
  const [wpm, setWpm] = useState(140);
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const tickerRef = useRef<number | null>(null);

  const current = videos.find((v) => v.id === videoId);
  const text = current?.speakerNotes?.trim() ||
    "(No speaker notes yet — paste from the slide editor or write your script first.)";

  // Auto-scroll while running.
  useEffect(() => {
    if (!running || !scrollerRef.current) return;
    const wordsPerSec = wpm / 60;
    const pxPerSec = wordsPerSec * 12; // ~12px per word; tuned for 18px line-height
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollTop += pxPerSec * dt;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 100);
      if (el.scrollTop >= max) { setRunning(false); return; }
      tickerRef.current = requestAnimationFrame(tick);
    };
    tickerRef.current = requestAnimationFrame(tick);
    return () => { if (tickerRef.current) cancelAnimationFrame(tickerRef.current); };
  }, [running, wpm]);

  const reset = () => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    setProgress(0);
  };

  // Mic capture (audio-only for now; video capture lives in RecordInBrowser).
  const startMic = async () => {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        // Surface a download for now — pipeline to /api/recordings/.../link is downstream work.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-${current?.title ?? "untitled"}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      setRecError((e as Error).message);
    }
  };
  const stopMic = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  // Keyboard: ↑/↓ adjust WPM, Space toggles play/pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowUp")   { setWpm((w) => Math.min(260, w + 10)); e.preventDefault(); }
      if (e.key === "ArrowDown") { setWpm((w) => Math.max(60,  w - 10)); e.preventDefault(); }
      if (e.code === "Space")    { setRunning((r) => !r);                e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 flex flex-col" onClick={(e) => e.stopPropagation()}>
      <header className="px-5 py-3 flex items-center gap-3 text-white">
        <select
          value={videoId ?? ""}
          onChange={(e) => { setVideoId(e.target.value); reset(); setRunning(false); }}
          className="bg-slate-800 text-white text-[12.5px] font-semibold border border-slate-700 rounded px-2 py-1.5 max-w-md"
        >
          {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">WPM</span>
          <input
            type="number" min={60} max={260} value={wpm}
            onChange={(e) => setWpm(Number(e.target.value) || 140)}
            className="w-16 bg-slate-800 text-white text-[12.5px] font-mono border border-slate-700 rounded px-2 py-1 text-center"
          />
        </div>
        <button onClick={() => setRunning((r) => !r)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded ${running ? "bg-amber-500 text-slate-900" : "bg-emerald-500 text-slate-900"} text-[12.5px] font-bold`}>
          {running ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Play</>}
        </button>
        <button onClick={reset} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 text-white text-[12px] hover:bg-slate-700"><RotateCcw className="w-3 h-3" /> Reset</button>
        {recording ? (
          <button onClick={stopMic} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500 text-white text-[12.5px] font-bold animate-pulse">
            <MicOff className="w-3.5 h-3.5" /> Stop &amp; download
          </button>
        ) : (
          <button onClick={startMic} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bi-blue-600 text-white text-[12.5px] font-bold hover:bg-bi-blue-700">
            <Mic className="w-3.5 h-3.5" /> Record audio
          </button>
        )}
        {recError && <span className="text-[11px] text-rose-300">{recError}</span>}
        <div className="ml-auto flex items-center gap-3">
          <div className="w-40 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-bi-blue-500" style={{ width: `${progress}%` }} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>
      </header>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-hidden px-12 py-12 max-w-[900px] mx-auto w-full"
      >
        <div className="text-white text-[34px] font-extrabold leading-[1.4] whitespace-pre-wrap selection:bg-bi-blue-600">
          {text}
        </div>
        <div className="h-[60vh]" />
      </div>
      <footer className="px-5 py-2 text-[11px] text-slate-400 text-center border-t border-slate-800">
        Space play/pause · ↑/↓ WPM · Esc to close · WPM {wpm} · {Math.round(progress)}%
      </footer>
    </div>
  );
}
