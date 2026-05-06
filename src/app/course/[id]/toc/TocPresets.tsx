"use client";

// TOC shape presets — replaces the abstract "depth slider" with named
// presets that show concrete outputs (module / lesson / hour counts +
// Bloom cap). Coach feedback: "click to change level — how? utility?"
// Solution: pick a shape, see what you'll get.

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

const PRESETS = [
  {
    id: "overview",
    label: "Overview",
    arc: "beginner_only" as const,
    modules: "3–4",
    lessons: "12–18",
    hours: "1.5–3",
    bloom: "Remember / Understand",
    fit: "Quick crash-course or sales enablement.",
  },
  {
    id: "standard",
    label: "Standard",
    arc: "beginner_to_intermediate" as const,
    modules: "5–8",
    lessons: "30–48",
    hours: "4–8",
    bloom: "Understand / Apply",
    fit: "Most paid courses live here.",
  },
  {
    id: "comprehensive",
    label: "Comprehensive",
    arc: "mixed" as const,
    modules: "8–12",
    lessons: "50–80",
    hours: "10–18",
    bloom: "Apply / Analyze",
    fit: "Multi-week curriculum with capstone.",
  },
  {
    id: "mastery",
    label: "Mastery",
    arc: "advanced" as const,
    modules: "12–16",
    lessons: "80–120",
    hours: "20–40",
    bloom: "Analyze / Evaluate / Create",
    fit: "Cohort or certification track.",
  },
] as const;

type PresetId = typeof PRESETS[number]["id"];
type ArcId = typeof PRESETS[number]["arc"];

export function TocPresets({
  courseId,
  initialArc,
}: {
  courseId: string;
  initialArc: ArcId;
}) {
  const initial: PresetId =
    PRESETS.find((p) => p.arc === initialArc)?.id ?? "standard";

  const [picked, setPicked] = useState<PresetId>(initial);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const save = async (id: PresetId) => {
    setPicked(id);
    setBusy(true);
    try {
      const arc = PRESETS.find((p) => p.id === id)?.arc ?? "mixed";
      const cur = await fetch(`/api/courses/${courseId}/profile`).then((r) => (r.ok ? r.json() : null));
      const profile = cur?.profile ?? {};
      profile.difficulty_arc = arc;
      await fetch(`/api/courses/${courseId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-bi-navy-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Course shape</div>
          <div className="text-[14px] font-bold text-bi-navy-900">How deep should this course go?</div>
        </div>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin text-bi-navy-500" />
        ) : (
          savedAt && <span className="text-[11px] text-emerald-700 font-semibold">Saved at {savedAt}</span>
        )}
      </div>
      <p className="text-[12px] text-bi-navy-500 mb-3">
        Pick a shape, see the rough output. Drives module density, Bloom cap, assessment depth, and the AI&apos;s
        intuitions about lesson granularity.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {PRESETS.map((p) => {
          const isPicked = picked === p.id;
          return (
            <button
              key={p.id}
              onClick={() => save(p.id)}
              className={`text-left p-3 rounded-md border-2 transition-all ${
                isPicked ? "border-bi-blue-600 bg-bi-blue-50" : "border-bi-navy-100 hover:border-bi-navy-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isPicked && <Sparkles className="w-3 h-3 text-bi-blue-700" />}
                <div className="text-[13px] font-bold text-bi-navy-900">{p.label}</div>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10.5px]">
                <span className="text-bi-navy-500">Modules</span>
                <span className="text-bi-navy-900 font-mono font-semibold">{p.modules}</span>
                <span className="text-bi-navy-500">Lessons</span>
                <span className="text-bi-navy-900 font-mono font-semibold">{p.lessons}</span>
                <span className="text-bi-navy-500">Hours</span>
                <span className="text-bi-navy-900 font-mono font-semibold">{p.hours}</span>
              </div>
              <div className="mt-1.5 text-[10px] text-bi-navy-500 font-semibold uppercase tracking-wide">
                Bloom: {p.bloom}
              </div>
              <div className="mt-1 text-[11px] text-bi-navy-600 italic">{p.fit}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
