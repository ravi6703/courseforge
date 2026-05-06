"use client";

// Profile templates picker — opens a dialog showing seed templates +
// any org-saved templates. Picking one fills the editor (caller decides
// what to do with the chosen profile).

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Check, X, BookOpen } from "lucide-react";
import type { CourseProfile } from "@/types/course-profile";

interface Template {
  id: string;
  name: string;
  description: string | null;
  profile: CourseProfile;
  health_score: number | null;
  uses_count: number;
  is_global: boolean;
}

export function TemplatesPicker({ onPick }: { onPick: (profile: CourseProfile) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/profile-templates")
      .then((r) => r.json())
      .then((j) => setItems(j.templates ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-bi-blue-200 bg-bi-blue-50 text-bi-blue-700 text-[12px] font-semibold hover:bg-bi-blue-100"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Start from a template
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">Profile templates</div>
                <h2 className="text-[15px] font-bold text-slate-900">Pick a starting point</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </header>
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-[12.5px] text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading templates…</div>
              ) : items.length === 0 ? (
                <div className="text-[12.5px] text-slate-500 italic">No templates available yet.</div>
              ) : (
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => { onPick(t.profile); setOpen(false); }}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-bi-blue-300 hover:bg-bi-blue-50/30"
                      >
                        <div className="flex items-start gap-3">
                          <span className="p-2 rounded-md bg-bi-blue-50 text-bi-blue-700 shrink-0"><BookOpen className="w-4 h-4" /></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-slate-900">{t.name}</span>
                              {t.is_global && <span className="text-[9.5px] uppercase tracking-wider font-bold text-slate-500 px-1 py-px bg-slate-100 rounded">starter</span>}
                              {t.health_score !== null && <span className="text-[10.5px] text-emerald-700 font-bold">Health {t.health_score}</span>}
                            </div>
                            {t.description && <p className="text-[11.5px] text-slate-600 mt-0.5">{t.description}</p>}
                            <div className="text-[10.5px] text-slate-500 mt-1 font-mono">
                              {t.profile.audience?.level} · {t.profile.tone?.primary} · {t.profile.pedagogy?.preset?.replace(/_/g, " ")} · {t.profile.pedagogy?.theory_handson_ratio}% theory
                            </div>
                          </div>
                          <Check className="w-4 h-4 text-bi-blue-600 opacity-0 group-hover:opacity-100" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
