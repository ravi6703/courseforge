"use client";

// TOC generation progress card.
//
// Replaces the silent spinner during course creation. Phases tick over
// roughly in sync with what the /api/generate-toc endpoint actually does:
//   1. Researching competitor courses (Tavily / Brave when keys are set)
//   2. Drafting course-level objectives (Claude Sonnet 4.6)
//   3. Generating module structure
//   4. Allocating Bloom progression
//   5. Drafting lesson outlines
//   6. Validating time budget
//   7. Saving TOC
//
// Time-driven, not event-driven — the underlying route is single-shot, so
// the phases give the user a sense of progress and transparency about what
// the system actually does. The "About" link discloses the real model and
// inputs.

import { useEffect, useState } from "react";
import { Check, HelpCircle, Loader2, X } from "lucide-react";

const PHASES = [
  { id: "research",   label: "Researching competitor courses",       ms: 2500 },
  { id: "objectives", label: "Drafting course-level objectives",      ms: 2000 },
  { id: "modules",    label: "Generating module structure",           ms: 3500 },
  { id: "bloom",      label: "Allocating Bloom progression",          ms: 2000 },
  { id: "lessons",    label: "Drafting lesson outlines",              ms: 4000 },
  { id: "budget",     label: "Validating time budget",                ms: 1500 },
  { id: "saving",     label: "Saving TOC to your course",             ms: 1500 },
];

export function TocGenerationProgress({ active }: { active: boolean }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!active) { setPhaseIdx(0); return; }
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled || i >= PHASES.length - 1) return;
      i += 1;
      setPhaseIdx(i);
      setTimeout(tick, PHASES[i].ms);
    };
    setTimeout(tick, PHASES[0].ms);
    return () => { cancelled = true; };
  }, [active]);

  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-bi-navy-900">Building your course outline</h3>
          <p className="text-[12.5px] text-bi-navy-500 mt-0.5">
            This usually takes 30–60 seconds. You can leave the page open while we work.
          </p>
        </div>
        <button
          onClick={() => setAboutOpen(true)}
          className="inline-flex items-center gap-1 text-[11.5px] text-bi-blue-700 hover:underline"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          About TOC generation
        </button>
      </div>

      <ol className="rounded-lg border border-bi-navy-100 bg-white divide-y divide-bi-navy-100 overflow-hidden">
        {PHASES.map((p, i) => {
          const done = i < phaseIdx;
          const current = i === phaseIdx;
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`shrink-0 w-5 h-5 rounded-full grid place-items-center ${
                done    ? "bg-emerald-100 text-emerald-700" :
                current ? "bg-bi-blue-100 text-bi-blue-700" :
                          "bg-bi-navy-100 text-bi-navy-400"
              }`}>
                {done ? <Check className="w-3 h-3" /> :
                 current ? <Loader2 className="w-3 h-3 animate-spin" /> :
                 <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
              </span>
              <span className={`text-[13px] ${
                done ? "text-bi-navy-500" :
                current ? "font-semibold text-bi-navy-900" :
                          "text-bi-navy-400"
              }`}>
                {p.label}
                {current && <span className="ml-1.5 text-bi-blue-600">…</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {aboutOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-xl border border-bi-navy-200 shadow-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-[16px] font-bold text-bi-navy-900">How CourseForge generates the TOC</h3>
              <button onClick={() => setAboutOpen(false)} className="text-bi-navy-500 hover:text-bi-navy-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2 text-[13px] text-bi-navy-700 leading-relaxed">
              <li><span className="font-semibold">Model.</span> Claude Sonnet 4.6 with a 4,096-token output budget per call.</li>
              <li><span className="font-semibold">What we send.</span> Your course title, description, audience level, prerequisites, target job roles, certification goal, theory/hands-on ratio, time budget, content types, project / capstone flags, and (optionally) the URL of a reference course.</li>
              <li><span className="font-semibold">Research step.</span> When TAVILY_API_KEY or BRAVE_API_KEY is configured we surface 3–5 competitor courses and a "why this is better" positioning paragraph. Without those keys the research step is skipped.</li>
              <li><span className="font-semibold">Pedagogy guardrails.</span> The prompt instructs the model to align modules to Bloom&apos;s taxonomy and tile the learner-time budget across modules.</li>
              <li><span className="font-semibold">Privacy.</span> We do not fine-tune on your content; this is a single-shot prompt over the public Anthropic API. Your data isn&apos;t used to train models.</li>
              <li><span className="font-semibold">Validation.</span> After generation we run a pedagogy lint and write the modules / lessons / videos to your course in three bulk inserts.</li>
            </ul>
            <button
              onClick={() => setAboutOpen(false)}
              className="mt-4 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 text-[12.5px] font-semibold hover:bg-bi-blue-200"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
