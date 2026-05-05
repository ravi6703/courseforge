"use client";

// Depth slider — "how cognitively deep should this course go?"
//
// Drives the difficulty arc on courses.profile.difficulty_arc and seeds
// downstream content defaults (assessment difficulty, hands-on intensity).
// Lives at the top of the TOC tab so it's visible before the coach drills in.

import { useState } from "react";
import { Loader2 } from "lucide-react";

const ARCS = [
  { id: "beginner_only",            label: "Beginner",            sub: "Recall + understand throughout", value: 1 },
  { id: "beginner_to_intermediate", label: "Beginner → Apply",    sub: "Climbs to apply by the capstone", value: 2 },
  { id: "mixed",                    label: "Mixed",               sub: "Foundations + advanced co-mingled", value: 3 },
  { id: "advanced",                 label: "Advanced",            sub: "Analyze / evaluate / create",    value: 4 },
] as const;
type ArcId = typeof ARCS[number]["id"];

export function DepthSlider({
  courseId, initial,
}: {
  courseId: string;
  initial: ArcId;
}) {
  const [arc, setArc] = useState<ArcId>(initial);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const save = async (next: ArcId) => {
    setArc(next);
    setBusy(true);
    try {
      // Read full profile, patch difficulty_arc, write back. The profile
      // route accepts the full CourseProfile shape.
      const cur = await fetch(`/api/courses/${courseId}/profile`).then((r) => r.ok ? r.json() : null);
      const profile = cur?.profile ?? {};
      profile.difficulty_arc = next;
      await fetch(`/api/courses/${courseId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-lg border border-bi-navy-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Depth</div>
          <div className="text-[14px] font-bold text-bi-navy-900">How deep should the course go?</div>
        </div>
        {busy ? <Loader2 className="w-4 h-4 animate-spin text-bi-navy-500" /> :
          savedAt && <span className="text-[11px] text-emerald-700 font-semibold">Saved at {savedAt}</span>}
      </div>
      <p className="text-[12px] text-bi-navy-500 mb-3">
        Seeds downstream defaults — assessment difficulty, hands-on intensity, and Bloom-level targets for module objectives.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ARCS.map((a) => (
          <button
            key={a.id}
            onClick={() => save(a.id)}
            className={`text-left p-2.5 rounded-md border-2 transition-all ${
              arc === a.id ? "border-bi-blue-600 bg-bi-blue-50" : "border-bi-navy-100 hover:border-bi-navy-200"
            }`}
          >
            <div className="text-[12.5px] font-bold text-bi-navy-900">{a.label}</div>
            <div className="text-[11px] text-bi-navy-500 mt-0.5">{a.sub}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
