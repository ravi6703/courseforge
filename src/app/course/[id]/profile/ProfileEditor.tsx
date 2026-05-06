"use client";

// Course Profile editor — the one place a coach sets audience, tone,
// pedagogy, vocabulary, brand, reading list, and difficulty arc. Every
// downstream AI prompt reads these fields via getProfile() + buildPromptFragment.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, X, Plus, ChevronRight } from "lucide-react";
import {
  CourseProfile, TONE_PRESETS, BLOOM_LEVELS, MONETIZATION_TIERS,
} from "@/types/course-profile";
import { summarizeProfile } from "@/lib/course-profile";
import { ProfilePreview } from "./ProfilePreview";
import { TemplatesPicker } from "./TemplatesPicker";

type Section =
  | "audience" | "outcomes" | "monetization" | "timeline"
  | "tone" | "pedagogy" | "vocabulary" | "brand" | "reading" | "difficulty";

const SECTIONS: Array<{ id: Section; label: string; sub: string; group: "core" | "voice" | "branding" }> = [
  { id: "audience",     label: "Audience",          sub: "Who is this course for?",                          group: "core" },
  { id: "outcomes",     label: "Outcomes",          sub: "Bloom verbs, prerequisites, success criteria",     group: "core" },
  { id: "monetization", label: "Monetization",      sub: "Free / paid / premium / enterprise",               group: "core" },
  { id: "timeline",     label: "Timeline",          sub: "Days to complete · target deadline",               group: "core" },
  { id: "tone",         label: "Tone & locale",     sub: "How should the AI sound?",                         group: "voice" },
  { id: "pedagogy",     label: "Pedagogy",          sub: "How is learning structured?",                      group: "voice" },
  { id: "vocabulary",   label: "Vocabulary",        sub: "Must-include & banned terms",                      group: "voice" },
  { id: "difficulty",   label: "Difficulty arc",    sub: "How does cognitive demand rise?",                  group: "voice" },
  { id: "brand",        label: "Brand kit",         sub: "Logo, colors, typography, slide template",         group: "branding" },
  { id: "reading",      label: "Reference reading", sub: "Papers and links the AI can cite",                 group: "branding" },
];

const GROUP_LABELS: Record<"core" | "voice" | "branding", string> = {
  core: "Strategic",
  voice: "Voice & pedagogy",
  branding: "Brand & references",
};

export function ProfileEditor({ courseId, initial }: { courseId: string; initial: CourseProfile }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [profile, setProfile] = useState<CourseProfile>(initial);
  const [activeSection, setActiveSection] = useState<Section>("audience");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof CourseProfile>(key: K, value: CourseProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setSavedAt(new Date().toLocaleTimeString());
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4">
      {/* Section nav */}
      <aside className="bg-white border border-slate-200 rounded-[10px] p-2 self-start">
        {(["core","voice","branding"] as const).map((g) => (
          <div key={g} className="mb-2 last:mb-0">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[.06em] text-slate-400">
              {GROUP_LABELS[g]}
            </div>
            {SECTIONS.filter((s) => s.group === g).map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-[13.5px] transition-colors ${
                  activeSection === s.id
                    ? "bg-slate-900 text-white font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div>{s.label}</div>
                <div className={`text-[11px] mt-0.5 ${activeSection === s.id ? "text-slate-300" : "text-slate-500"}`}>
                  {s.sub}
                </div>
              </button>
            ))}
          </div>
        ))}
        <div className="mt-3 px-2">
          <Link
            href={`/course/${courseId}/toc`}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-bi-blue-600 text-white text-[12.5px] font-semibold hover:bg-bi-blue-700"
          >
            Continue to TOC <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Editor pane */}
      <main className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-[10px] p-5">
          {activeSection === "audience"     && <AudienceSection     profile={profile} update={update} />}
          {activeSection === "outcomes"     && <OutcomesSection     profile={profile} update={update} />}
          {activeSection === "monetization" && <MonetizationSection profile={profile} update={update} />}
          {activeSection === "timeline"     && <TimelineSection     profile={profile} update={update} />}
          {activeSection === "tone"         && <ToneSection         profile={profile} update={update} />}
          {activeSection === "pedagogy"     && <PedagogySection     profile={profile} update={update} />}
          {activeSection === "vocabulary"   && <VocabularySection   profile={profile} update={update} />}
          {activeSection === "brand"        && <BrandSection        profile={profile} update={update} />}
          {activeSection === "reading"      && <ReadingSection      profile={profile} update={update} />}
          {activeSection === "difficulty"   && <DifficultySection   profile={profile} update={update} />}
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-[10px] px-4 py-3">
          <div className="text-[12px] text-slate-500">
            <span className="font-semibold text-slate-700">Live summary: </span>
            {summarizeProfile(profile)}
          </div>
          <div className="flex items-center gap-3">
            {savedAt && <span className="text-[11px] text-emerald-700 font-semibold">Saved at {savedAt}</span>}
            {error && <span className="text-[11px] text-red-700">{error}</span>}
            <TemplatesPicker
              onPick={(picked) => {
                setProfile(picked);
              }}
            />
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save profile
            </button>
          </div>
        </div>
      </main>

      {/* Live AI preview — rendered samples + raw prompt fragment */}
      <ProfilePreview courseId={courseId} profile={profile} />
    </div>
  );
}

// ─── Section editors ────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-[12px] font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-[13.5px] border border-slate-200 rounded-md outline-none focus:border-bi-blue-600 focus:ring-2 focus:ring-bi-blue-100 transition-all bg-white text-slate-900";

function AudienceSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const a = profile.audience;
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Audience</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Be specific. The AI uses this in every prompt.</p>
      <Field label="Primary persona" hint="One sentence — role, experience level, what they're trying to do.">
        <textarea
          rows={2}
          className={inputCls}
          value={a.primary_persona}
          onChange={(e) => update("audience", { ...a, primary_persona: e.target.value })}
          placeholder="Backend dev, 2–5 years, comfortable with REST, new to event-driven systems."
        />
      </Field>
      <Field label="Level">
        <div className="flex gap-2">
          {(["beginner","intermediate","advanced"] as const).map((l) => (
            <button
              key={l}
              onClick={() => update("audience", { ...a, level: l })}
              className={`px-3 py-1.5 rounded-md text-[12.5px] font-semibold capitalize border transition-all ${
                a.level === l ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >{l}</button>
          ))}
        </div>
      </Field>
      <Field label="Secondary personas" hint="Optional. One per line.">
        <textarea
          rows={3}
          className={inputCls}
          value={a.secondary_personas.join("\n")}
          onChange={(e) => update("audience", { ...a, secondary_personas: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
          placeholder="Frontend dev curious about backends&#10;PM evaluating an automation purchase"
        />
      </Field>
    </>
  );
}

function ToneSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const t = profile.tone;
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Tone & locale</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">How the AI sounds across briefs, slides, and content.</p>
      <Field label="Primary tone">
        <div className="grid grid-cols-2 gap-2">
          {TONE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => update("tone", { ...t, primary: p.id })}
              className={`text-left px-3 py-2.5 rounded-md border transition-all ${
                t.primary === p.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="text-[13px] font-semibold">{p.label}</div>
              <div className={`text-[11px] mt-0.5 ${t.primary === p.id ? "text-slate-300" : "text-slate-500"}`}>{p.what}</div>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Locale" hint="BCP-47 — affects spelling, examples, idioms.">
        <select
          className={inputCls}
          value={t.locale}
          onChange={(e) => update("tone", { ...t, locale: e.target.value })}
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi (India)</option>
          <option value="es-ES">Spanish (Spain)</option>
          <option value="es-419">Spanish (Latin America)</option>
          <option value="ar">Arabic</option>
        </select>
      </Field>
    </>
  );
}

function PedagogySection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const p = profile.pedagogy;
  const presets = [
    { id: "bloom_strict",  label: "Bloom strict",  what: "Cognitive demand rises module-by-module per Bloom's taxonomy." },
    { id: "project_led",   label: "Project-led",   what: "Every module produces an artifact; capstone integrates them." },
    { id: "lecture_led",   label: "Lecture-led",   what: "Concept-first; hands-on after the foundation." },
    { id: "case_based",    label: "Case-based",    what: "Each lesson opens with a real-world case to dissect." },
  ] as const;
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Pedagogy</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Influences module structure, lesson order, and assessment design.</p>
      <Field label="Preset">
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => update("pedagogy", { ...p, preset: preset.id })}
              className={`text-left px-3 py-2.5 rounded-md border transition-all ${
                p.preset === preset.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="text-[13px] font-semibold">{preset.label}</div>
              <div className={`text-[11px] mt-0.5 ${p.preset === preset.id ? "text-slate-300" : "text-slate-500"}`}>{preset.what}</div>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Theory ↔ hands-on" hint={`${p.theory_handson_ratio}% theory · ${100 - p.theory_handson_ratio}% hands-on`}>
        <input
          type="range"
          min={0} max={100}
          value={p.theory_handson_ratio}
          onChange={(e) => update("pedagogy", { ...p, theory_handson_ratio: Number(e.target.value) })}
          className="w-full accent-slate-900"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
          <span>0 · all hands-on</span><span>50 · balanced</span><span>100 · all theory</span>
        </div>
      </Field>
    </>
  );
}

function VocabularySection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const v = profile.vocabulary;
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Vocabulary</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Domain terms the AI should keep using, and ones it should avoid.</p>
      <ChipList
        label="Must-include terms"
        hint="The AI will keep using these. Useful for tools/SDK names, brand product names."
        items={v.must_include}
        onChange={(items) => update("vocabulary", { ...v, must_include: items })}
        placeholder="e.g. workflow, trigger, n8n"
        accent="emerald"
      />
      <ChipList
        label="Banned terms"
        hint="The AI will avoid these. Useful for jargon, brand-conflicting names."
        items={v.banned}
        onChange={(items) => update("vocabulary", { ...v, banned: items })}
        placeholder="e.g. pipeline, magical, leverage"
        accent="red"
      />
    </>
  );
}

function ChipList({ label, hint, items, onChange, placeholder, accent }: {
  label: string; hint: string; items: string[];
  onChange: (items: string[]) => void; placeholder: string; accent: "emerald" | "red";
}) {
  const [draft, setDraft] = useState("");
  const colorCls = accent === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[1.5rem]">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[12px] font-medium ${colorCls}`}>
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:bg-white/40 rounded-full p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder={placeholder}
        />
        <button
          onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}
          className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-700"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </Field>
  );
}

function BrandSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const b = profile.brand;
  const set = (patch: Partial<typeof b>) => update("brand", { ...b, ...patch });
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Brand kit</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Applied to every generated slide deck and SCORM bundle.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary color">
          <div className="flex items-center gap-2">
            <input type="color" value={b.primary_color} onChange={(e) => set({ primary_color: e.target.value })} className="h-10 w-12 rounded-md border border-slate-200" />
            <input className={inputCls} value={b.primary_color} onChange={(e) => set({ primary_color: e.target.value })} />
          </div>
        </Field>
        <Field label="Secondary color">
          <div className="flex items-center gap-2">
            <input type="color" value={b.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} className="h-10 w-12 rounded-md border border-slate-200" />
            <input className={inputCls} value={b.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} />
          </div>
        </Field>
        <Field label="Accent color (optional)">
          <div className="flex items-center gap-2">
            <input type="color" value={b.accent_color || "#FFB800"} onChange={(e) => set({ accent_color: e.target.value })} className="h-10 w-12 rounded-md border border-slate-200" />
            <input className={inputCls} value={b.accent_color || ""} onChange={(e) => set({ accent_color: e.target.value })} placeholder="#FFB800" />
          </div>
        </Field>
        <Field label="Typography">
          <select className={inputCls} value={b.typography} onChange={(e) => set({ typography: e.target.value })}>
            <option>Inter</option><option>Manrope</option><option>Helvetica</option>
            <option>Source Sans Pro</option><option>Open Sans</option><option>Roboto</option>
          </select>
        </Field>
      </div>
      <Field label="Logo URL (optional)" hint="HTTPS link to a 256×256 or larger PNG/SVG.">
        <input className={inputCls} value={b.logo_url || ""} onChange={(e) => set({ logo_url: e.target.value })} placeholder="https://…/logo.png" />
      </Field>
      <Field label="Slide template">
        <div className="grid grid-cols-4 gap-2">
          {(["minimal","editorial","vibrant","academic"] as const).map((tpl) => (
            <button
              key={tpl}
              onClick={() => set({ slide_template: tpl })}
              className={`px-3 py-2 rounded-md text-[12px] font-semibold capitalize border transition-all ${
                b.slide_template === tpl ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >{tpl}</button>
          ))}
        </div>
      </Field>
    </>
  );
}

function ReadingSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const r = profile.reading_list;
  const setItem = (i: number, patch: Partial<typeof r[number]>) =>
    update("reading_list", r.map((x, j) => j === i ? { ...x, ...patch } : x));
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Reference reading</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Up to 20 papers/links the AI can cite. Surfaced in briefs and content's reading artifact.</p>
      <div className="space-y-2">
        {r.map((item, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3 bg-slate-50">
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} value={item.title} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="Title" />
              <input className={inputCls} value={item.url}   onChange={(e) => setItem(i, { url: e.target.value })}   placeholder="https://…" />
            </div>
            <input className={`${inputCls} mt-2`} value={item.why} onChange={(e) => setItem(i, { why: e.target.value })} placeholder="Why this matters (1 line)" />
            <button
              onClick={() => update("reading_list", r.filter((_, j) => j !== i))}
              className="mt-2 text-[11px] font-semibold text-red-700 hover:underline"
            >Remove</button>
          </div>
        ))}
        <button
          onClick={() => update("reading_list", [...r, { title: "", url: "", why: "" }])}
          className="w-full px-3 py-2 rounded-md border border-dashed border-slate-300 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
        >+ Add a reference</button>
      </div>
    </>
  );
}

function DifficultySection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const arcs = [
    { id: "beginner_only",            label: "Beginner only",            what: "Stays at recall/understand throughout." },
    { id: "beginner_to_intermediate", label: "Beginner → Intermediate",  what: "Climbs from recall to apply by the capstone." },
    { id: "mixed",                    label: "Mixed",                    what: "Foundations + advanced topics co-mingled." },
    { id: "advanced",                 label: "Advanced",                 what: "Assumes deep prior knowledge; analyze/evaluate/create." },
  ] as const;
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Difficulty arc</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Pedagogy lint uses this to grade Bloom's progression.</p>
      <div className="space-y-2">
        {arcs.map((a) => (
          <button
            key={a.id}
            onClick={() => update("difficulty_arc", a.id)}
            className={`w-full text-left px-3 py-2.5 rounded-md border transition-all ${
              profile.difficulty_arc === a.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="text-[13px] font-semibold">{a.label}</div>
            <div className={`text-[11px] mt-0.5 ${profile.difficulty_arc === a.id ? "text-slate-300" : "text-slate-500"}`}>{a.what}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function OutcomesSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const o = profile.outcomes;
  const set = (patch: Partial<typeof o>) => update("outcomes", { ...o, ...patch });
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Outcomes</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">
        Action-verb statements the learner will be able to do. Used by the AI when generating
        TOCs, briefs, and assessments — and to drive learner-readiness scoring.
      </p>
      <Field label="Bloom-level cap" hint="The highest cognitive demand the course will reach.">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
          {BLOOM_LEVELS.map((b) => (
            <button
              key={b.id}
              onClick={() => set({ bloom_cap: b.id })}
              className={`px-2 py-2 rounded-md border text-[11.5px] font-semibold capitalize transition-all ${
                o.bloom_cap === b.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title={`Verbs: ${b.verbs.join(", ")}`}
            >{b.label}</button>
          ))}
        </div>
      </Field>
      <Field label="Learning outcomes" hint='One per line — start each with a Bloom verb. e.g. "Build a multi-agent workflow that handles edge cases".'>
        <textarea
          rows={6}
          className={inputCls}
          value={(o.outcomes ?? []).join("\n")}
          onChange={(e) => set({ outcomes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder={"Implement a CRUD API with auth\nDiagnose 5xx errors using observability tools\nDesign a database schema for a SaaS"}
        />
      </Field>
      <Field label="Prerequisites" hint="What the learner should know coming in. One per line.">
        <textarea
          rows={3}
          className={inputCls}
          value={(o.prerequisites ?? []).join("\n")}
          onChange={(e) => set({ prerequisites: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder={"Comfortable with JavaScript fundamentals\nHas used Git for at least 3 months"}
        />
      </Field>
      <Field label="Success criteria" hint="How we'll know the learner has mastered the course.">
        <textarea
          rows={3}
          className={inputCls}
          value={(o.success_criteria ?? []).join("\n")}
          onChange={(e) => set({ success_criteria: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder={"Ships a working capstone project\nScores 80%+ on the final assessment\nCan answer 'why' questions in their own words"}
        />
      </Field>
    </>
  );
}

function MonetizationSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const m = profile.monetization;
  const set = (patch: Partial<typeof m>) => update("monetization", { ...m, ...patch });
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Monetization</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">
        How the course is delivered. Affects expected production quality, asset count, and pricing tier signals downstream.
      </p>
      <Field label="Tier">
        <div className="grid grid-cols-2 gap-2">
          {MONETIZATION_TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => set({ tier: t.id })}
              className={`text-left px-3 py-2.5 rounded-md border transition-all ${
                m.tier === t.id ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="text-[13px] font-semibold">{t.label}</div>
              <div className={`text-[11px] mt-0.5 ${m.tier === t.id ? "text-slate-300" : "text-slate-500"}`}>{t.what}</div>
            </button>
          ))}
        </div>
      </Field>
      {(m.tier === "paid" || m.tier === "premium") && (
        <Field label="Target list price (USD)" hint="Used for benchmarking against competitor courses.">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={m.price_usd ?? ""}
            onChange={(e) => set({ price_usd: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder={m.tier === "premium" ? "499" : "99"}
          />
        </Field>
      )}
    </>
  );
}

function TimelineSection({ profile, update }: { profile: CourseProfile; update: <K extends keyof CourseProfile>(k: K, v: CourseProfile[K]) => void }) {
  const t = profile.timeline;
  const set = (patch: Partial<typeof t>) => update("timeline", { ...t, ...patch });
  return (
    <>
      <h2 className="text-[16px] font-bold text-slate-900 mb-1">Timeline</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">
        How long you have to ship this course. When you lock the TOC, we'll auto-generate a per-lesson Gantt
        plan (script → slides → record → edit → transcript → assets → publish) using these targets.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target days to complete" hint="Rough days you're giving yourself.">
          <input
            type="number"
            min={1}
            max={365}
            className={inputCls}
            value={t.target_days ?? ""}
            onChange={(e) => set({ target_days: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="21"
          />
        </Field>
        <Field label="Hard deadline (optional)" hint="Or pick a date — we'll back-solve days.">
          <input
            type="date"
            className={inputCls}
            value={t.target_date ?? ""}
            onChange={(e) => set({ target_date: e.target.value || undefined })}
          />
        </Field>
      </div>
      <p className="text-[11.5px] text-slate-500 mt-2">
        Tip: if you're not sure, start with a target — you can always change it. Slipping steps surface as
        red in the Gantt and trigger in-app notifications.
      </p>
    </>
  );
}
