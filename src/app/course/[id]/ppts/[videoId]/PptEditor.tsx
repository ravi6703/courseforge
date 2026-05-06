"use client";

// Three-pane PPT editor — redesigned per coach feedback.
//
// LEFT    slide tiles (numbered, status pip)
// MIDDLE  visual slide canvas (16:9 wireframe with brand colors) +
//         a compact form panel below for title / bullets / image /
//         speaker notes / layout
// RIGHT   inline AI Edit chat scoped to the active slide
//
// The visual canvas is the big change vs. v1 — coaches now see what
// they're building, not just edit fields in isolation.

import { useState } from "react";
import { Loader2, Plus, Image as ImageIcon, Trash2, X, Save, Sparkles } from "lucide-react";
import { SlideCanvas } from "./SlideCanvas";
import { SlideAiEdit } from "./SlideAiEdit";

interface SlideRow {
  id: string;
  slide_number: number;
  title: string;
  content: unknown;
  speaker_notes: string | null;
  layout_type: string;
  status: string;
  image_url?: string | null;
}

interface Brand {
  primary?: string;
  accent?: string;
  font?: string;
}

const LAYOUTS: Array<SlideRow["layout_type"]> = ["title", "content", "two_column", "diagram", "summary", "code"];

function bulletsOf(content: unknown): string[] {
  if (Array.isArray(content)) return content.map(String);
  if (typeof content === "string") return content.split("\n").filter(Boolean);
  return [];
}

export function PptEditor({
  courseId, videoId, videoTitle, initialSlides, brand,
}: {
  courseId: string;
  videoId: string;
  videoTitle: string;
  initialSlides: SlideRow[];
  brand?: Brand;
}) {
  void courseId;
  const [slides, setSlides] = useState<SlideRow[]>(initialSlides);
  const [activeId, setActiveId] = useState<string | null>(initialSlides[0]?.id ?? null);
  const [imgBusy, setImgBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const active = slides.find((s) => s.id === activeId) ?? null;
  const activeIndex = active ? slides.findIndex((s) => s.id === active.id) : -1;

  const setActiveSlide = (patch: Partial<SlideRow>) => {
    setSlides((s) => s.map((x) => (x.id === activeId ? { ...x, ...patch } : x)));
    setSavedAt(null);
  };

  const refreshActiveFromServer = async () => {
    if (!active) return;
    const res = await fetch(`/api/ppts/slides/${active.id}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.slide) {
      setSlides((s) => s.map((x) => x.id === active.id ? data.slide : x));
    }
  };

  const saveActive = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await fetch(`/api/ppts/slides/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: active.title,
          content: active.content,
          speaker_notes: active.speaker_notes,
          layout_type: active.layout_type,
          image_url: active.image_url ?? null,
        }),
      });
      setSavedAt(new Date().toLocaleTimeString());
    } finally { setSaving(false); }
  };

  const addSlide = async () => {
    const next = (slides[slides.length - 1]?.slide_number ?? 0) + 1;
    const res = await fetch(`/api/ppts/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, slide_number: next, title: "New slide", content: [], layout_type: "content" }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setSlides((s) => [...s, data.slide]);
    setActiveId(data.slide.id);
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await fetch(`/api/ppts/slides/${id}`, { method: "DELETE" });
    setSlides((s) => s.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(slides[0]?.id ?? null);
  };

  const generateImage = async () => {
    if (!active) return;
    const desc = window.prompt(
      "Describe the image to generate:",
      `${active.title} — clean educational diagram, white background`,
    );
    if (!desc?.trim()) return;
    setImgBusy(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: desc.trim(), style: "diagram" }),
      });
      const data = await res.json();
      if (res.ok && data.url) setActiveSlide({ image_url: data.url });
    } finally { setImgBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_300px] gap-3">
      {/* LEFT — slide tiles */}
      <aside className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden self-start">
        <header className="px-3 py-2.5 border-b border-bi-navy-100">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500">Slides</div>
          <div className="text-[12px] text-bi-navy-700 truncate">{videoTitle}</div>
        </header>
        <ul className="max-h-[68vh] overflow-y-auto py-1">
          {slides.map((s) => {
            const isSel = s.id === activeId;
            return (
              <li key={s.id} className="group">
                <button
                  onClick={() => setActiveId(s.id)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2 border-l-[3px] ${
                    isSel ? "bg-bi-blue-50 border-l-bi-blue-400" : "border-l-transparent hover:bg-bi-navy-50"
                  }`}
                >
                  <span className="text-[10px] font-mono text-bi-navy-400 tabular-nums w-5 mt-0.5">{s.slide_number}</span>
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      s.status === "approved" || s.status === "finalized" ? "bg-emerald-500" :
                      s.status === "in_review" ? "bg-purple-500" :
                      s.status === "draft" || s.status === "generated" ? "bg-amber-500" :
                      "bg-slate-300"
                    }`}
                    title={`Status: ${s.status}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12px] truncate ${isSel ? "font-semibold text-bi-navy-900" : "text-bi-navy-700"}`}>{s.title || "Untitled"}</div>
                    <div className="text-[10.5px] text-bi-navy-400 capitalize">{s.layout_type.replace("_", " ")}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSlide(s.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              </li>
            );
          })}
          {slides.length === 0 && (
            <li className="px-3 py-6 text-[12px] text-bi-navy-500 text-center italic">No slides yet.</li>
          )}
        </ul>
        <div className="border-t border-bi-navy-100 p-2">
          <button
            onClick={addSlide}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-bi-navy-200 text-[12px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
          >
            <Plus className="w-3 h-3" /> Add slide
          </button>
        </div>
      </aside>

      {/* MIDDLE — canvas + edit form */}
      <main className="space-y-3 self-start min-w-0">
        {!active ? (
          <div className="bg-white border border-bi-navy-100 rounded-lg p-12 text-center text-[13px] text-bi-navy-500">
            Pick a slide on the left.
          </div>
        ) : (
          <>
            {/* Canvas */}
            <SlideCanvas
              slide={active}
              brand={brand}
              slideNumber={activeIndex + 1}
              slideCount={slides.length}
            />

            {/* Edit form */}
            <div className="bg-white border border-bi-navy-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500">
                  Slide {active.slide_number} · {active.layout_type.replace("_", " ")}
                </span>
                <select
                  value={active.layout_type}
                  onChange={(e) => setActiveSlide({ layout_type: e.target.value })}
                  className="text-[11.5px] border border-bi-navy-200 rounded px-2 py-1 bg-white capitalize"
                >
                  {LAYOUTS.map((l) => <option key={l} value={l}>{l.replace("_", " ")}</option>)}
                </select>
              </div>

              <input
                value={active.title}
                onChange={(e) => setActiveSlide({ title: e.target.value })}
                placeholder="Slide title"
                className="w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[14px] font-semibold text-bi-navy-900"
              />

              <textarea
                value={bulletsOf(active.content).join("\n")}
                onChange={(e) => setActiveSlide({ content: e.target.value.split("\n").filter(Boolean) })}
                rows={4}
                placeholder="One bullet per line"
                className="w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[12.5px] leading-relaxed font-mono"
              />

              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded border border-bi-navy-100 bg-bi-navy-50 grid place-items-center text-bi-navy-300 overflow-hidden shrink-0">
                  {active.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={active.image_url} alt="" className="w-full h-full object-cover" />
                  ) : <ImageIcon className="w-4 h-4" />}
                </div>
                {active.image_url ? (
                  <button
                    onClick={() => setActiveSlide({ image_url: null })}
                    className="text-[11.5px] text-red-600 hover:underline inline-flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove image
                  </button>
                ) : (
                  <button
                    onClick={generateImage}
                    disabled={imgBusy}
                    className="text-[11.5px] inline-flex items-center gap-1 px-2 py-1 rounded-md border border-bi-blue-200 bg-bi-blue-50 text-bi-blue-700 hover:bg-bi-blue-100 font-semibold disabled:opacity-50"
                  >
                    {imgBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generate image
                  </button>
                )}
              </div>

              <textarea
                value={active.speaker_notes ?? ""}
                onChange={(e) => setActiveSlide({ speaker_notes: e.target.value })}
                rows={2}
                placeholder="Speaker notes — what the presenter says aloud."
                className="w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[12px]"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bi-navy-100">
                {savedAt && <span className="text-[11px] text-emerald-700 mr-auto">Saved at {savedAt}</span>}
                <button
                  onClick={saveActive}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12.5px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save slide
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* RIGHT — AI Edit chat */}
      <aside className="self-start min-h-[320px]">
        {active ? (
          <SlideAiEdit
            videoId={videoId}
            slideNumber={active.slide_number}
            onApplied={refreshActiveFromServer}
          />
        ) : (
          <div className="bg-white border border-bi-navy-100 rounded-lg p-4 text-[12px] text-bi-navy-500 italic">
            Pick a slide to enable AI edits.
          </div>
        )}
      </aside>
    </div>
  );
}
