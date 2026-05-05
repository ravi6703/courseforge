"use client";

// Record-in-browser modal.
//
// Quick narration capture without leaving CourseForge. Uses the
// MediaRecorder API to grab a webm/opus audio blob, then PUTs it
// through the existing signed-URL upload flow + finalize + transcribe.
//
// Scope is intentionally small for round C:
//   - Audio only (mic). Video can be added later.
//   - Single take; no built-in editor (re-record overwrites).
//   - Up to ~10 minutes per take (browser memory governs).

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Play, RotateCcw, X } from "lucide-react";

interface Props {
  courseId: string;
  videoId: string;
  videoTitle: string;
  promptText?: string; // optional teleprompter text (round-C add-on)
  onComplete?: (recordingId: string) => void;
  onClose: () => void;
}

type Phase = "idle" | "recording" | "preview" | "uploading" | "transcribing" | "done" | "error";

export function RecordInBrowser({ courseId, videoId, videoTitle, promptText, onComplete, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (tickRef.current) clearInterval(tickRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setPhase("preview");
        if (tickRef.current) clearInterval(tickRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setPhase("recording");
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      setPhase("error");
      setError("Microphone permission denied or unavailable. Allow mic access in your browser settings.");
      void e;
    }
  };

  const stop = () => recorderRef.current?.stop();
  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreviewUrl(null); setPhase("idle"); setElapsed(0);
  };

  const upload = async () => {
    if (!blob) return;
    setPhase("uploading");
    setError(null);
    try {
      // 1) Sign URL.
      const signRes = await fetch("/api/upload/recording/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId, videoId,
          contentType: "audio/webm",
          size: blob.size,
          filename: `record-${Date.now()}.webm`,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.signedUrl) throw new Error(signData.error || "could not sign upload URL");

      // 2) PUT to signed URL.
      const putRes = await fetch(signData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });
      if (!putRes.ok) throw new Error("upload failed");

      // 3) Finalize.
      const finRes = await fetch("/api/upload/recording/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId, videoId,
          path: signData.path,
          contentType: "audio/webm",
          filename: `record-${Date.now()}.webm`,
        }),
      });
      const finData = await finRes.json();
      if (!finRes.ok) throw new Error(finData.error || "finalize failed");

      // 4) Auto-transcribe.
      setPhase("transcribing");
      const tRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: finData.recording_id }),
      });
      // Don't fail if transcribe times out — recording still exists.
      void tRes;

      setPhase("done");
      onComplete?.(finData.recording_id);
    } catch (e) {
      setPhase("error");
      setError((e as Error).message);
    }
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-bi-navy-100 shadow-bi-md p-6">
        <header className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500">Record narration</div>
            <h2 className="text-[16px] font-semibold text-bi-navy-900 truncate max-w-md">{videoTitle}</h2>
          </div>
          <button onClick={onClose} className="text-bi-navy-500 hover:text-bi-navy-900">
            <X className="w-4 h-4" />
          </button>
        </header>

        {promptText && (
          <div className="mb-4 rounded-lg border border-bi-blue-100 bg-bi-blue-50/60 px-4 py-3 max-h-40 overflow-y-auto text-[13.5px] leading-relaxed text-bi-navy-800 whitespace-pre-wrap">
            {promptText}
          </div>
        )}

        <div className="rounded-lg border border-bi-navy-100 p-5 text-center">
          {phase === "idle" && (
            <button
              onClick={start}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[14px] font-semibold hover:bg-bi-blue-200"
            >
              <Mic className="w-5 h-5" /> Start recording
            </button>
          )}
          {phase === "recording" && (
            <div className="space-y-3">
              <div className="text-[34px] font-mono font-semibold text-bi-navy-900 tabular-nums">{mmss}</div>
              <div className="text-[12px] text-bi-navy-500 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording
              </div>
              <button
                onClick={stop}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[13px] font-semibold hover:bg-red-100"
              >
                <Square className="w-4 h-4" /> Stop
              </button>
            </div>
          )}
          {phase === "preview" && previewUrl && (
            <div className="space-y-3">
              <div className="text-[12.5px] text-bi-navy-500">Preview the take. Upload to save + transcribe, or re-record.</div>
              <audio src={previewUrl} controls className="w-full" />
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-bi-navy-200 text-[12.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-record
                </button>
                <button
                  onClick={upload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12.5px] font-semibold hover:bg-bi-blue-200"
                >
                  <Play className="w-3.5 h-3.5" /> Save &amp; transcribe
                </button>
              </div>
            </div>
          )}
          {phase === "uploading" && (
            <div className="text-[13px] text-bi-navy-700 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </div>
          )}
          {phase === "transcribing" && (
            <div className="text-[13px] text-bi-navy-700 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Transcribing…
            </div>
          )}
          {phase === "done" && (
            <div className="space-y-2">
              <div className="text-[13px] text-emerald-700">✓ Recording saved. Open the Transcript tab to review.</div>
              <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-bi-navy-200 text-[12.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50">Close</button>
            </div>
          )}
          {phase === "error" && (
            <div className="space-y-2">
              <div className="text-[12.5px] text-red-700">{error}</div>
              <button onClick={reset} className="px-3 py-1.5 rounded-md border border-bi-navy-200 text-[12.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50">Try again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
