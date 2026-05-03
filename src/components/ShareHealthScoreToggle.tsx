"use client";

// Drop-in toggle for the Final Review tab. Lets a PM publish the course's
// health score to the open /health-score/<id> page. Shows the public URL
// once flipped on so they can copy/share it.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function ShareHealthScoreToggle({
  courseId,
  initialPublic,
}: {
  courseId: string;
  initialPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const flip = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/public-health-score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setIsPublic(data.public);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const url =
    typeof window === "undefined"
      ? `/health-score/${courseId}`
      : `${window.location.origin}/health-score/${courseId}`;

  return (
    <div className="rounded-lg border border-bi-navy-100 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-bi-navy-700">Public health score</div>
          <p className="text-sm text-bi-navy-600 mt-1 max-w-prose">
            Publish this course&apos;s pedagogy score on the open web. Anyone with the link sees the score and the per-rule
            breakdown — useful for marketing pages, LMS profiles, and public catalogs.
          </p>
        </div>
        <button
          onClick={() => flip(!isPublic)}
          disabled={busy}
          aria-pressed={isPublic}
          className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition ${
            isPublic
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-bi-navy-100 text-bi-navy-700 hover:bg-bi-navy-200"
          } disabled:opacity-60`}
        >
          {isPublic ? <Check size={14} /> : null}
          {isPublic ? "Published" : "Make public"}
        </button>
      </div>

      {isPublic && (
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 text-xs bg-bi-navy-50 border border-bi-navy-100 rounded px-2 py-1 truncate">{url}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="shrink-0 inline-flex items-center gap-1 text-xs text-bi-blue-600 hover:underline"
          >
            <Copy size={12} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
    </div>
  );
}
