"use client";

// Three-pane PPT editor.
//
// LEFT   slide tiles
// MIDDLE editable slide (title + bullets + image slot + speaker notes)
// RIGHT  AI Edit chat (per-slide instructions go through aiComplete via
//        the existing /api/ppt/by-video/[videoId]/rewrite endpoint with
//        a slide_number filter — implemented in this file by calling
//        rewrite then taking the matching returned slide).
//
// We persist edits via a small inline endpoint in /api/ppts/slides/[id]
// (added in this round). Image slot uses /api/ai/generate-image (already
// shipped) and writes the URL onto the slide.

import { useState } from "react";
import { Sparkles, Loader2, Plus, Image as ImageIcon, Wand2, Save, Trash2, X } from "lucide-react";

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

const LAYOUTS: Array<SlideRow["layout_type"]> = ["title", "content", "two_column", "diagram", "summary", "code"];

function bulletsOf(content: unknown): string[] {
  if (Array.isArray(content)) return content.map(String);
  if (typeof content === "string") return content.split("\n").filter(Boolean);
  return [];
}

export function PptEditor({
  courseId, videoId, videoTitle, initialSlides,
}: {
  courseId: string;
  videoId: string;
  videoTitle: string;
  initialSlides: SlideRow[];
}) {
  void courseId;
  const [slides, setSlides] = useState<SlideRow[]>(initialSlides);
  const [activeId, setActiveId] = useState<string | null>(initialSlides[0]?.id ?? null);
  const [aiBusy, setAiBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const active = slides.find((s) => s.id === activeId) ?? null;

  const setActiveSlide = (patch: Partial<SlideRow>) => {
    setSlides((s) => s.map((x) => (x.id === activeId ? { ...x, ...patch } : x)));
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
    } finally { setSaving(false); }
  };

  const addSlide = async () => {
    const next = (slides[slides.length - 1]?.slide_number ?? 0) + 1;
    const res = await fetch(`/api/ppts/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId, slide_number: next,
        title: "New slide", content: [], layout_type: "content",
      }),
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
      if (res.ok && data.url) {
        setActiveSlide({ image_url: data.url });
      }
    } finally { setImgBusy(false); }
  };

  const aiEditActive = async () => {
    if (!active) return;
    const instruction = window.prompt(
      "Describe an edit (e.g. 'make bullets one line each', 'rewrite for a less technical audience', 'add a callout for the most common mistake'):",
    );
    if (!instruction?.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch(`/api/ppt/by-video/${videoId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: `[Slide ${active.slide_number} only] ${instruction.trim()}` }),
      });
      if (res.ok) {
        // The rewrite endpoint persists; refresh the active slide from server.
        const refreshed = await fetch(`/api/ppts/slides/${active.id}`).then((r) => r.ok ? r.json() : null);
        if (refreshed?.slide) setActiveSlide(refreshed.slide);
      }
    } finally { setAiBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_300px] gap-3">
      {/* LEFT — slide tiles */}
      <aside className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden self-start">
        <div className="px-3 py-2.5 border-b border-bi-navy-100">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500">Slides</div>
          <div className="text-[12px] text-bi-navy-700 truncate">{videoTitle}</div>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto py-1">
          {slides.map((s) => {
            const isSel = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setActiveId(s.id)}
                  className={`group w-full text-left flex items-start gap-2 px-3 py-2 border-l-[3px] ${
                    isSel ? "bg-bi-blue-50 border-l-bi-blue-400" : "border-l-transparent hover:bg-bi-navy-50"
                  }`}
                >
                  <span className="text-[10px] font-mono text-bi-navy-400 tabular-nums w-5 mt-0.5">{s.slide_number}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12px] truncate ${isSel ? "font-semibold text-bi-navy-900" : "text-bi-navy-700"}`}>{s.title || "Untitled"}</div>
                    <div className="text-[10.5px] text-bi-navy-400 capitalize">{s.layout_type}</div>
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

      {/* MIDDLE — editor */}
      <main className="bg-white border border-bi-navy-100 rounded-lg p-5 self-start">
        {!active ? (
          <div className="text-center text-[13px] text-bi-navy-500 py-12">Pick a slide on the left.</div>
        ) : (
          <div className="space-y-4">
            <header className="flex items-baseline justify-between">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500">
                Slide {active.slide_number}
              </div>
              <select
                value={active.layout_type}
                onChange={(e) => setActiveSlide({ layout_type: e.target.value })}
                className="text-[11.5px] border border-bi-navy-200 rounded px-2 py-1 bg-white capitalize"
              >
                {LAYOUTS.map((l) => <option key={l} value={l}>{l.replace("_", " ")}</option>)}
              </select>
            </header>

            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500">Title</label>
              <input
                value={active.title}
                onChange={(e) => setActiveSlide({ title: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[15px] font-semibold text-bi-navy-900"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500">Bullets</label>
              <textarea
                value={bulletsOf(active.content).join("\n")}
                onChange={(e) => setActiveSlide({ content: e.target.value.split("\n").filter(Boolean) })}
                rows={6}
                placeholder="One bullet per line."
                className="mt-1 w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[13.5px] leading-relaxed font-mono"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500">Image</label>
              <div className="mt-1 rounded-md border border-dashed border-bi-navy-200 p-3 flex items-center gap-3">
                {active.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={active.image_url} alt="" className="w-32 h-20 object-cover rounded border border-bi-navy-100" />
                    <div className="flex-1 text-[11.5px] text-bi-navy-500 truncate">{active.image_url}</div>
                    <button
                      onClick={() => setActiveSlide({ image_url: null })}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-20 rounded border border-bi-navy-100 bg-bi-navy-50 grid place-items-center text-bi-navy-300">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <button
                      onClick={generateImage}
                      disabled={imgBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
                    >
                      {imgBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Generate image
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-bi-navy-500">Speaker notes</label>
              <textarea
                value={active.speaker_notes ?? ""}
                onChange={(e) => setActiveSlide({ speaker_notes: e.target.value })}
                rows={3}
                placeholder="What the presenter says aloud while this slide is on screen."
                className="mt-1 w-full px-3 py-2 border border-bi-navy-200 rounded-md text-[13px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-bi-navy-100">
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
        )}
      </main>

      {/* RIGHT — AI Edit on this slide */}
      <aside className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden self-start">
        <div className="px-3 py-2.5 border-b border-bi-navy-100">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500 inline-flex items-center gap-1.5">
            <Wand2 className="w-3 h-3" /> AI edit
          </div>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-[12px] text-bi-navy-500 leading-relaxed">
            Tell the AI what to change about <strong>just this slide</strong>. E.g. "make bullets one line each" or
            "add a callout for the most common mistake."
          </p>
          <button
            onClick={aiEditActive}
            disabled={aiBusy || !active}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
          >
            {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Edit with AI
          </button>
          <p className="text-[10.5px] text-bi-navy-400 italic">
            For deck-wide rewrites use the Tone button in the PPT tracker.
          </p>
        </div>
      </aside>
    </div>
  );
}
