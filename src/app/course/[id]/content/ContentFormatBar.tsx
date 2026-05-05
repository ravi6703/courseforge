"use client";

// Content tab format-config bar.
//
// Sits above the lesson tree + workspace and lets the coach configure the
// course's default output formats:
//   - Reading material   — RTE / Markdown / Word
//   - Assessment         — difficulty / question count / question types
//   - SCORM              — version 1.2 or 2004
//
// These defaults seed the AI generators and the per-video config UI; per-video
// overrides still trump these defaults.

import { useState } from "react";
import { Loader2, Settings2, Check } from "lucide-react";
import type { ContentFormatDefaults } from "@/types";

export function ContentFormatBar({
  courseId, initial,
}: {
  courseId: string;
  initial: ContentFormatDefaults;
}) {
  const [state, setState] = useState<ContentFormatDefaults>(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_format_defaults: state }),
      });
      if (res.ok) setSavedAt(new Date().toLocaleTimeString());
    } finally { setSaving(false); }
  };

  const reading = state.reading?.format ?? "rte";
  const assess = state.assessment ?? { difficulty: "intermediate", count: 5, types: ["mcq_single"] };
  const scorm = state.scorm?.version ?? "1.2";

  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm">
      <header className="px-4 py-3 border-b border-bi-navy-100 flex items-center justify-between">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Content format defaults</div>
          <h3 className="text-[14px] font-bold text-bi-navy-900">Reading · Assessment · SCORM</h3>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && <span className="text-[11px] text-emerald-700 font-semibold">Saved at {savedAt}</span>}
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-bi-navy-100 text-[12px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {open ? "Close" : "Configure"}
          </button>
        </div>
      </header>

      {!open ? (
        <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-[12.5px]">
          <Summary label="Reading"    value={reading === "rte" ? "Rich-text editor" : reading === "word" ? "Word document" : "Markdown"} />
          <Summary label="Assessment" value={`${assess.count} ${assess.difficulty} questions · ${assess.types.length} type${assess.types.length === 1 ? "" : "s"}`} />
          <Summary label="SCORM"      value={`SCORM ${scorm}`} />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Reading */}
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1.5">Reading material format</div>
            <div className="flex flex-wrap gap-1.5">
              {(["rte", "markdown", "word"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setState({ ...state, reading: { format: fmt } })}
                  className={`px-2.5 py-1 rounded-md border text-[12px] font-semibold ${reading === fmt ? "bg-bi-navy-900 text-white border-bi-navy-900" : "border-bi-navy-200 text-bi-navy-700 hover:bg-bi-navy-50"}`}
                >
                  {fmt === "rte" ? "Rich-text editor" : fmt === "markdown" ? "Markdown" : "Word document"}
                </button>
              ))}
            </div>
          </div>

          {/* Assessment */}
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1.5">Assessment</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-bi-navy-600">Difficulty</label>
                <select
                  value={assess.difficulty}
                  onChange={(e) => setState({ ...state, assessment: { ...assess, difficulty: e.target.value as "beginner" | "intermediate" | "advanced" } })}
                  className="w-full mt-0.5 px-2 py-1 border border-bi-navy-200 rounded text-[12.5px]"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-bi-navy-600">Question count</label>
                <input
                  type="number" min={1} max={50}
                  value={assess.count}
                  onChange={(e) => setState({ ...state, assessment: { ...assess, count: parseInt(e.target.value, 10) || 5 } })}
                  className="w-full mt-0.5 px-2 py-1 border border-bi-navy-200 rounded text-[12.5px]"
                />
              </div>
              <div>
                <label className="text-[11px] text-bi-navy-600">Question types</label>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {(["mcq_single", "mcq_multi", "true_false", "short_answer"] as const).map((t) => {
                    const on = assess.types.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setState({
                          ...state,
                          assessment: {
                            ...assess,
                            types: on ? assess.types.filter((x) => x !== t) : [...assess.types, t],
                          },
                        })}
                        className={`px-2 py-1 rounded-md border text-[11px] font-semibold ${on ? "bg-bi-blue-600 text-white border-bi-blue-600" : "border-bi-navy-200 text-bi-navy-700 hover:bg-bi-navy-50"}`}
                      >
                        {t === "mcq_single" ? "MCQ" : t === "mcq_multi" ? "MCQ multi" : t === "true_false" ? "T/F" : "Short answer"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SCORM */}
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500 mb-1.5">SCORM</div>
            <div className="flex gap-1.5">
              {(["1.2", "2004"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setState({ ...state, scorm: { version: v } })}
                  className={`px-2.5 py-1 rounded-md border text-[12px] font-semibold ${scorm === v ? "bg-bi-navy-900 text-white border-bi-navy-900" : "border-bi-navy-200 text-bi-navy-700 hover:bg-bi-navy-50"}`}
                >
                  SCORM {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-bi-navy-100">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-bi-navy-900 text-white text-[12.5px] font-semibold hover:bg-bi-navy-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save defaults
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">{label}</div>
      <div className="text-[13px] font-semibold text-bi-navy-900 mt-0.5">{value}</div>
    </div>
  );
}
