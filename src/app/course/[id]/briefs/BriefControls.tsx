"use client";

// Brief authoring controls — sits above the brief preview on every
// BriefCard. Surfaces the course audience reminder, lets the coach
// override tone for THIS brief, shows reading-level fit + vocab
// compliance, and offers per-section regenerate.

import { useState } from "react";
import { Loader2, RotateCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { TONE_PRESETS, type ToneId, type CourseProfile } from "@/types/course-profile";
import { readability, bandLabel } from "@/lib/format/readability";
import { vocabCheck } from "@/lib/format/vocabCheck";

type Section = "talking_points" | "visual_cues" | "key_takeaways" | "script_outline";

interface BriefShape {
  // Stored as jsonb upstream → unknown at the call site. Coerce inside.
  talking_points: unknown;
  visual_cues: unknown;
  key_takeaways: unknown;
  script_outline?: string | unknown;
  estimated_duration?: string | unknown;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? ""));
  if (typeof v === "string" && v.length > 0) {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j.map((x) => String(x ?? "")); }
    catch { /* not JSON */ }
    return [v];
  }
  return [];
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function BriefControls({
  videoId, courseId, brief, profile, onGenerated,
}: {
  videoId: string;
  courseId: string;
  brief: BriefShape | null;
  profile: CourseProfile | null;
  onGenerated?: () => void;
}) {
  const [tone, setTone] = useState<ToneId | "">(""); // "" = use course default
  const [busy, setBusy] = useState<Section | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build the searchable text used for reading-level + vocab check.
  const allText = brief ? [
    ...asList(brief.talking_points),
    ...asList(brief.visual_cues),
    ...asList(brief.key_takeaways),
    asString(brief.script_outline),
  ].join(" ") : "";

  const fk = readability(allText);
  const audienceLevel = profile?.audience.level ?? "intermediate";
  const fitBand = brief ? bandLabel(fk.fleschKincaid, audienceLevel) : null;

  const must = profile?.vocabulary.must_include ?? [];
  const ban  = profile?.vocabulary.banned ?? [];
  const vc   = brief ? vocabCheck(allText, must, ban) : null;

  const persona = profile?.audience.primary_persona;
  const courseTone = profile?.tone.primary;

  const fire = async (section: Section | "all") => {
    setBusy(section);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId, courseId,
          toneOverride: tone || undefined,
          regenerateSection: section === "all" ? undefined : section,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`);
      else onGenerated?.();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-3">
      {/* Audience reminder */}
      {persona && (
        <div className="mb-3 px-3 py-2 rounded-md bg-bi-blue-50 border border-bi-blue-100">
          <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-bi-blue-700 mb-0.5">Audience reminder</div>
          <div className="text-[12.5px] text-slate-800 leading-snug">{persona}</div>
        </div>
      )}

      {/* Tone selector */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[11px] font-bold uppercase tracking-[.05em] text-slate-700">Tone for this brief</div>
          {courseTone && tone === "" && (
            <span className="text-[10px] text-slate-500">Using course default: <span className="font-semibold text-slate-700">{TONE_PRESETS.find((t) => t.id === courseTone)?.label}</span></span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTone("")}
            className={`px-2.5 py-1 rounded-md border text-[11.5px] font-semibold transition-all ${
              tone === "" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-white"
            }`}
          >Use course default</button>
          {TONE_PRESETS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              title={t.what}
              className={`px-2.5 py-1 rounded-md border text-[11.5px] font-semibold transition-all ${
                tone === t.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Quality meters — only render once we have a brief to score */}
      {brief && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Meter
            label="Reading level"
            value={`Grade ${fk.fleschKincaid.toFixed(1)} · ${fk.level}`}
            tone={fitBand?.tone ?? "emerald"}
            note={fitBand?.label === "match" ? "matches audience" : `${fitBand?.label} target band`}
          />
          <Meter
            label="Vocabulary"
            value={vc?.ok ? "On-brand" : "Issues"}
            tone={vc?.ok ? "emerald" : (vc?.banned_present.length ? "red" : "amber")}
            note={
              vc?.banned_present.length ? `Banned: ${vc.banned_present.join(", ")}` :
              vc?.must_include_missing.length ? `Missing: ${vc.must_include_missing.join(", ")}` :
              "All required terms present"
            }
          />
        </div>
      )}

      {/* Per-section regenerate */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] font-bold uppercase tracking-[.05em] text-slate-700 mr-1.5">Regenerate</span>
        {(["talking_points","visual_cues","key_takeaways","script_outline"] as const).map((s) => (
          <button
            key={s}
            onClick={() => fire(s)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === s ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
            {s.replace("_", " ")}
          </button>
        ))}
        <button
          onClick={() => fire("all")}
          disabled={busy !== null}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-900 text-white text-[11.5px] font-semibold hover:bg-slate-800 disabled:opacity-50"
        >
          {busy === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
          Re-generate full brief
        </button>
      </div>

      {error && (
        <div className="mt-2 text-[11.5px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1">{error}</div>
      )}
    </div>
  );
}

function Meter({ label, value, tone, note }: {
  label: string; value: string; tone: "emerald" | "amber" | "red";
  note: string;
}) {
  const cls = tone === "emerald" ? "border-emerald-200 bg-emerald-50/60"
            : tone === "amber"   ? "border-amber-200 bg-amber-50/60"
                                  : "border-red-200 bg-red-50/60";
  const Icon = tone === "emerald" ? CheckCircle2 : AlertTriangle;
  const iconCls = tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-red-600";
  return (
    <div className={`rounded-md border ${cls} px-3 py-2`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
        <span className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-700">{label}</span>
      </div>
      <div className="mt-0.5 text-[12.5px] font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-600 mt-0.5">{note}</div>
    </div>
  );
}
