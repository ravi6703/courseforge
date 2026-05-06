"use client";

// Course-level PPT deck settings — tone, template, brand kit, slide
// count target, must-include elements. Persisted to courses.ppt_settings.
//
// Coach feedback: "more features can be added here. tone of ppt, template
// of ppt, any specific things — suggest what should be done."

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

export interface PptSettings {
  tone: "concise" | "conversational" | "formal" | "energetic" | "academic";
  template: "minimal" | "editorial" | "vibrant" | "academic" | "playful";
  brand_kit: { primary: string; accent: string; font: string };
  slide_count_target: number;
  must_include: string[]; // e.g. ["intro_slide","summary_slide","cta_slide","quiz_slide"]
}

const DEFAULT_SETTINGS: PptSettings = {
  tone: "conversational",
  template: "minimal",
  brand_kit: { primary: "#0B5FFF", accent: "#10B981", font: "Inter" },
  slide_count_target: 12,
  must_include: ["intro_slide", "summary_slide"],
};

const TONES: Array<{ id: PptSettings["tone"]; label: string; what: string }> = [
  { id: "concise",        label: "Concise",        what: "Short bullets, no filler." },
  { id: "conversational", label: "Conversational", what: "Direct, plain language." },
  { id: "formal",         label: "Formal",         what: "Professional, neutral register." },
  { id: "energetic",      label: "Energetic",      what: "Punchy, high-momentum." },
  { id: "academic",       label: "Academic",       what: "Citation-heavy, research tone." },
];

const TEMPLATES: Array<{ id: PptSettings["template"]; label: string; what: string }> = [
  { id: "minimal",   label: "Minimal",   what: "Lots of whitespace; type-led." },
  { id: "editorial", label: "Editorial", what: "Magazine-style, image-heavy." },
  { id: "vibrant",   label: "Vibrant",   what: "Strong colors and gradients." },
  { id: "academic",  label: "Academic",  what: "Citation panels, structured." },
  { id: "playful",   label: "Playful",   what: "Hand-drawn, casual." },
];

const MUST_INCLUDE: Array<{ id: string; label: string }> = [
  { id: "intro_slide",   label: "Title / Intro" },
  { id: "agenda_slide",  label: "Agenda" },
  { id: "summary_slide", label: "Summary" },
  { id: "cta_slide",     label: "Call-to-action" },
  { id: "quiz_slide",    label: "Quick quiz" },
  { id: "diagram_slide", label: "At-least-one diagram" },
  { id: "code_slide",    label: "At-least-one code block" },
  { id: "logo_slide",    label: "Brand logo" },
];

export function DeckSettings({
  courseId,
  initial,
}: {
  courseId: string;
  initial: Partial<PptSettings> | null;
}) {
  const merged: PptSettings = {
    ...DEFAULT_SETTINGS,
    ...(initial ?? {}),
    brand_kit: { ...DEFAULT_SETTINGS.brand_kit, ...(initial?.brand_kit ?? {}) },
    must_include: initial?.must_include ?? DEFAULT_SETTINGS.must_include,
  };
  const [s, setS] = useState<PptSettings>(merged);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const set = <K extends keyof PptSettings>(key: K, value: PptSettings[K]) =>
    setS((p) => ({ ...p, [key]: value }));

  const toggleMustInclude = (id: string) => {
    setS((p) => ({
      ...p,
      must_include: p.must_include.includes(id)
        ? p.must_include.filter((x) => x !== id)
        : [...p.must_include, id],
    }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await fetch(`/api/courses/${courseId}/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "courses", id: courseId, ppt_settings: s }),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally { setBusy(false); }
  };

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between hover:bg-slate-50">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-bi-navy-500">Deck settings</div>
          <div className="text-[14px] font-bold text-bi-navy-900">
            {s.template} · {s.tone} · ~{s.slide_count_target} slides · {s.must_include.length} must-includes
          </div>
        </div>
        <span className="text-[11px] text-bi-navy-500 font-semibold">click to edit</span>
      </summary>
      <div className="p-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-bi-navy-500 mb-1.5">Tone</div>
          <div className="grid grid-cols-2 gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => set("tone", t.id)}
                className={`text-left px-2.5 py-1.5 rounded border text-[11.5px] transition-all ${
                  s.tone === t.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className={`text-[10px] mt-0.5 ${s.tone === t.id ? "text-slate-300" : "text-slate-500"}`}>{t.what}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-bi-navy-500 mb-1.5">Template</div>
          <div className="grid grid-cols-2 gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => set("template", t.id)}
                className={`text-left px-2.5 py-1.5 rounded border text-[11.5px] transition-all ${
                  s.template === t.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className={`text-[10px] mt-0.5 ${s.template === t.id ? "text-slate-300" : "text-slate-500"}`}>{t.what}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-bi-navy-500 mb-1.5">Brand kit</div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[10.5px] text-slate-500">Primary
              <input type="color" value={s.brand_kit.primary} onChange={(e) => set("brand_kit", { ...s.brand_kit, primary: e.target.value })} className="block w-full h-8 rounded border border-slate-200" />
            </label>
            <label className="text-[10.5px] text-slate-500">Accent
              <input type="color" value={s.brand_kit.accent} onChange={(e) => set("brand_kit", { ...s.brand_kit, accent: e.target.value })} className="block w-full h-8 rounded border border-slate-200" />
            </label>
            <label className="text-[10.5px] text-slate-500">Font
              <select value={s.brand_kit.font} onChange={(e) => set("brand_kit", { ...s.brand_kit, font: e.target.value })} className="block w-full h-8 rounded border border-slate-200 text-[11.5px] px-2">
                <option>Inter</option><option>Manrope</option><option>Helvetica</option><option>Roboto</option>
              </select>
            </label>
          </div>
        </div>
        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-bi-navy-500 mb-1.5">Slide count target</div>
          <input
            type="number" min={3} max={60}
            value={s.slide_count_target}
            onChange={(e) => set("slide_count_target", Number(e.target.value) || 12)}
            className="w-24 px-2 py-1.5 border border-slate-200 rounded text-[12.5px]"
          />
          <span className="ml-2 text-[11px] text-slate-500">per video. AI may add ±25%.</span>
        </div>
        <div className="md:col-span-2">
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-bi-navy-500 mb-1.5">Must-include slides</div>
          <div className="flex flex-wrap gap-1.5">
            {MUST_INCLUDE.map((m) => {
              const on = s.must_include.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMustInclude(m.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                    on
                      ? "bg-bi-blue-100 border-bi-blue-300 text-bi-blue-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >{m.label}</button>
              );
            })}
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-end gap-2">
          {savedAt && <span className="text-[11px] text-emerald-700 font-semibold">Saved at {savedAt}</span>}
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-[12.5px] font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save deck settings
          </button>
        </div>
      </div>
    </details>
  );
}
