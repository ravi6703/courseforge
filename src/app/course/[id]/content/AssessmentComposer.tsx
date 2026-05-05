"use client";

// Assessment composer — 5-step config that replaces the old 3-field bar.
//
//   Step 1  Coverage          which LOs must be tested + which are uncovered
//   Step 2  Bloom mix         remember/understand/apply/analyze/evaluate/create
//   Step 3  Stem style        concept-first / scenario-first / case-based
//   Step 4  Distractor target misconceptions / varied / near-miss
//   Step 5  Time + mode       total budget, untimed / timed / proctored
//
// The composer is a side-rail for GQ + PQ. State persists into the content
// item's payload so re-generation honours the same spec.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Check, AlertTriangle } from "lucide-react";
import {
  AssessmentComposerSpec, DEFAULT_COMPOSER, BLOOM_LEVELS, bloomMixSum,
} from "@/types/assessment-composer";
import type { LearningObjective } from "@/types";

interface Props {
  contentItemId: string | null;
  videoId: string;
  /** Lesson + module objectives the composer can map coverage against. */
  objectives: LearningObjective[];
  /** Existing spec carried on the content_items.payload. */
  initial?: AssessmentComposerSpec;
  /** "pq" or "gq" — drives count defaults and target endpoint. */
  kind: "pq" | "gq";
  onGenerated?: () => void;
}

const STEM_STYLES: Array<{ id: AssessmentComposerSpec["stem_style"]; label: string; sub: string }> = [
  { id: "concept_first",  label: "Concept-first",  sub: "Definitional. Tests precise terminology." },
  { id: "scenario_first", label: "Scenario-first", sub: "Opens with a workplace situation." },
  { id: "case_based",     label: "Case-based",     sub: "One case carried across linked questions." },
];

const DISTRACTORS: Array<{ id: AssessmentComposerSpec["distractor_target"]; label: string; sub: string }> = [
  { id: "misconceptions", label: "Misconceptions", sub: "Pulls wrong answers from common pitfalls." },
  { id: "varied",         label: "Varied",         sub: "Mixes plausible + random distractors." },
  { id: "near_miss",      label: "Near-miss",      sub: "All distractors very close to correct." },
];

const MODES: Array<{ id: AssessmentComposerSpec["mode"]; label: string }> = [
  { id: "untimed",   label: "Untimed" },
  { id: "timed",     label: "Timed"   },
  { id: "proctored", label: "Proctored" },
];

export function AssessmentComposer({
  contentItemId, videoId, objectives, initial, kind, onGenerated,
}: Props) {
  const [spec, setSpec] = useState<AssessmentComposerSpec>(
    initial ?? { ...DEFAULT_COMPOSER, count: kind === "pq" ? 6 : 4 }
  );
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // ── Coverage signal ────────────────────────────────────────────────────
  const covered = new Set(spec.covered_objective_ids);
  const uncoveredCount = objectives.filter((o) => !covered.has(o.id)).length;
  const allCovered = uncoveredCount === 0 && objectives.length > 0;

  // ── Bloom mix sum sanity ───────────────────────────────────────────────
  const mixSum = bloomMixSum(spec.bloom_mix);
  const mixOff = Math.abs(mixSum - 100);

  // ── Time fit hint ──────────────────────────────────────────────────────
  const minutesPerQ = spec.total_minutes / Math.max(1, spec.count);
  const minutesHint = useMemo(() => {
    if (minutesPerQ < 0.5) return { tone: "amber" as const, text: "very tight; learners will rush" };
    if (minutesPerQ > 5)   return { tone: "amber" as const, text: "very generous; consider trimming" };
    return                       { tone: "emerald" as const, text: "comfortable budget" };
  }, [minutesPerQ]);

  useEffect(() => {
    setSavedAt(null);
  }, [spec]);

  const generate = async () => {
    setBusy(true);
    try {
      // Send the spec to the existing /api/content/generate endpoint as
      // generation_config; it stores it on the payload and is read by
      // the prompt builder.
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, kind, generation_config: spec }),
      });
      if (res.ok) { setSavedAt(new Date().toLocaleTimeString()); onGenerated?.(); }
    } finally { setBusy(false); }
  };

  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] overflow-hidden">
      <header className="px-4 py-2.5 border-b border-bi-navy-100">
        <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Assessment composer</div>
        <h3 className="text-[14px] font-bold text-bi-navy-900">{kind === "pq" ? "Practice quiz" : "Graded assessment"}</h3>
      </header>

      <div className="divide-y divide-bi-navy-100">
        {/* Step 1 — Coverage */}
        <Step number={1} title="Coverage" subtitle="Pick which learning objectives this assessment must test.">
          {objectives.length === 0 ? (
            <div className="text-[12px] text-bi-navy-500 italic">No objectives on this lesson yet — add them in the TOC.</div>
          ) : (
            <ul className="space-y-1">
              {objectives.map((o) => {
                const on = covered.has(o.id);
                return (
                  <li key={o.id}>
                    <label className={`flex items-start gap-2 cursor-pointer rounded p-1.5 hover:bg-bi-navy-50 ${on ? "" : ""}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setSpec((s) => ({
                          ...s,
                          covered_objective_ids: e.target.checked
                            ? [...s.covered_objective_ids, o.id]
                            : s.covered_objective_ids.filter((x) => x !== o.id),
                        }))}
                        className="mt-0.5"
                      />
                      <span className="text-[12.5px] text-bi-navy-700">
                        <span className="text-[10px] font-mono uppercase text-bi-navy-400 mr-1.5">{o.bloom_level}</span>
                        {o.text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {objectives.length > 0 && (
            <div className={`mt-2 text-[11px] flex items-center gap-1.5 ${allCovered ? "text-emerald-700" : "text-amber-700"}`}>
              {allCovered ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {allCovered ? "All objectives covered." : `${uncoveredCount} objective${uncoveredCount === 1 ? "" : "s"} not yet covered.`}
              <button
                type="button"
                onClick={() => setSpec((s) => ({ ...s, covered_objective_ids: objectives.map((o) => o.id) }))}
                className="ml-auto text-[10.5px] text-bi-blue-700 hover:underline"
              >
                Cover all
              </button>
            </div>
          )}
        </Step>

        {/* Step 2 — Bloom mix */}
        <Step number={2} title="Bloom mix" subtitle="Distribute cognitive demand. Sliders auto-cap at 100% total.">
          <div className="space-y-2">
            {BLOOM_LEVELS.map((b) => (
              <div key={b}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-bi-navy-700 capitalize">{b}</span>
                  <span className="text-bi-navy-500 tabular-nums">{spec.bloom_mix[b]}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={spec.bloom_mix[b]}
                  onChange={(e) => setSpec((s) => ({ ...s, bloom_mix: { ...s.bloom_mix, [b]: parseInt(e.target.value, 10) } }))}
                  className="w-full accent-bi-blue-600"
                />
              </div>
            ))}
            <div className={`text-[11px] mt-1 ${mixOff <= 5 ? "text-emerald-700" : "text-amber-700"}`}>
              Total: {mixSum}% {mixOff > 5 && "(should sum to 100%)"}
            </div>
          </div>
        </Step>

        {/* Step 3 — Stem style */}
        <Step number={3} title="Stem style" subtitle="How questions are framed.">
          <div className="grid grid-cols-1 gap-1.5">
            {STEM_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpec((p) => ({ ...p, stem_style: s.id }))}
                className={`text-left p-2 rounded-md border transition-all ${
                  spec.stem_style === s.id
                    ? "border-bi-blue-400 bg-bi-blue-50"
                    : "border-bi-navy-100 hover:border-bi-navy-200"
                }`}
              >
                <div className="text-[12.5px] font-semibold text-bi-navy-900">{s.label}</div>
                <div className="text-[11px] text-bi-navy-500">{s.sub}</div>
              </button>
            ))}
          </div>
        </Step>

        {/* Step 4 — Distractor target */}
        <Step number={4} title="Distractor quality" subtitle="The whole point of an MCQ.">
          <div className="grid grid-cols-1 gap-1.5">
            {DISTRACTORS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSpec((p) => ({ ...p, distractor_target: d.id }))}
                className={`text-left p-2 rounded-md border transition-all ${
                  spec.distractor_target === d.id
                    ? "border-bi-blue-400 bg-bi-blue-50"
                    : "border-bi-navy-100 hover:border-bi-navy-200"
                }`}
              >
                <div className="text-[12.5px] font-semibold text-bi-navy-900">{d.label}</div>
                <div className="text-[11px] text-bi-navy-500">{d.sub}</div>
              </button>
            ))}
          </div>
        </Step>

        {/* Step 5 — Time + mode */}
        <Step number={5} title="Time & mode" subtitle="Total budget; mode controls enforcement.">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-bi-navy-600 mb-1">Total minutes</label>
              <input
                type="number" min={1} max={240}
                value={spec.total_minutes}
                onChange={(e) => setSpec((s) => ({ ...s, total_minutes: parseInt(e.target.value, 10) || 15 }))}
                className="w-full px-2 py-1 border border-bi-navy-200 rounded text-[12.5px]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-bi-navy-600 mb-1">Question count</label>
              <input
                type="number" min={1} max={50}
                value={spec.count}
                onChange={(e) => setSpec((s) => ({ ...s, count: parseInt(e.target.value, 10) || 5 }))}
                className="w-full px-2 py-1 border border-bi-navy-200 rounded text-[12.5px]"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSpec((s) => ({ ...s, mode: m.id }))}
                className={`px-2.5 py-1 rounded-md border text-[11.5px] font-semibold ${
                  spec.mode === m.id
                    ? "bg-bi-navy-900 text-white border-bi-navy-900"
                    : "border-bi-navy-200 text-bi-navy-700 hover:bg-bi-navy-50"
                }`}
              >{m.label}</button>
            ))}
          </div>
          <div className={`mt-2 text-[11px] ${minutesHint.tone === "emerald" ? "text-emerald-700" : "text-amber-700"}`}>
            ~{minutesPerQ.toFixed(1)} min per question — {minutesHint.text}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11.5px] text-bi-navy-700">
            <input
              type="checkbox"
              checked={spec.bank_oversample}
              onChange={(e) => setSpec((s) => ({ ...s, bank_oversample: e.target.checked }))}
            />
            Generate 2× the count and shuffle (item bank)
          </label>
        </Step>
      </div>

      <footer className="px-4 py-3 border-t border-bi-navy-100 flex items-center justify-between">
        <div className="text-[11px] text-bi-navy-500">
          {savedAt && <span className="text-emerald-700 font-semibold">Generated at {savedAt}</span>}
          {!savedAt && contentItemId && <span>Spec ready · click Generate to apply.</span>}
          {!savedAt && !contentItemId && <span>Composer values are kept locally until first generate.</span>}
        </div>
        <button
          onClick={generate}
          disabled={busy || (objectives.length > 0 && spec.covered_objective_ids.length === 0) || mixOff > 20}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12.5px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {busy ? "Generating…" : `Generate ${kind === "pq" ? "practice quiz" : "graded assessment"}`}
        </button>
      </footer>
    </section>
  );
}

function Step({
  number, title, subtitle, children,
}: {
  number: number; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="inline-grid place-items-center w-5 h-5 rounded-full bg-bi-navy-100 text-bi-navy-700 text-[10px] font-bold">{number}</span>
        <h4 className="text-[13px] font-bold text-bi-navy-900">{title}</h4>
        <span className="text-[11px] text-bi-navy-500">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}
