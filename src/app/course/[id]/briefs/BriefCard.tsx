"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Zap, RefreshCw } from "lucide-react";

interface Brief {
  talking_points: unknown;
  visual_cues: unknown;
  key_takeaways: unknown;
  script_outline: string;
  status: string;
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  existingBrief: Brief | null;
}

export function BriefCard({
  lessonId,
  lessonTitle,
  moduleTitle,
  courseId,
  courseTitle,
  existingBrief,
}: Props) {
  const [brief, setBrief] = useState<Brief | null>(existingBrief);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          courseId,
          lessonTitle,
          moduleTitle,
          courseTitle,
          videoTitle: lessonTitle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBrief(data.brief);
        setExpanded(true);
      } else {
        setError("Generation failed");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const toList = (val: unknown): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    return String(val).split("\n").filter((l) => l.trim());
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 truncate">{moduleTitle}</div>
          <div className="font-medium text-slate-900 truncate">{lessonTitle}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-red-500">{error}</span>}
          {brief ? (
            <>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                Brief ready
              </span>
              <button
                onClick={generate}
                disabled={loading}
                title="Regenerate"
                className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-400 hover:text-slate-600"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </>
          ) : (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              {loading ? "Generating…" : "Generate brief"}
            </button>
          )}
        </div>
      </div>

      {brief && expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 text-sm">
          <BriefSection title="Talking Points" items={toList(brief.talking_points)} />
          <BriefSection title="Visual Cues" items={toList(brief.visual_cues)} />
          <BriefSection title="Key Takeaways" items={toList(brief.key_takeaways)} />
          {brief.script_outline && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Script Outline
              </div>
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-md p-3 border border-slate-200">
                {brief.script_outline}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-slate-700">
            <span className="text-blue-400 shrink-0 mt-0.5">·</span>
            <span>{item.replace(/^[-•·]\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
