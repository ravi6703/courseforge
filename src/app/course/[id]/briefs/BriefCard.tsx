"use client";

// Phase 1 — BriefCard is now keyed on videoId. Adds Approve / Unapprove
// gating button (PM-only). Suggest UI is unchanged from previous PR.

import { useState, useEffect } from "react";
import {
  ChevronDown, ChevronUp, Sparkles, RefreshCw, ClipboardList, FileText,
  Wand2, Check, X, CheckCircle2, RotateCcw,
} from "lucide-react";

interface CoachInput {
  key_topics: string;
  examples: string;
  visual_requirements: string;
  difficulty_notes: string;
  references: string;
  slide_count: string;          // string in form, parsed to int on submit
  estimated_minutes: string;    // string in form, parsed to int on submit
  objective_override: string;   // optional override for the lesson's default LO
}

interface Brief {
  id?: string;
  talking_points: unknown;
  visual_cues: unknown;
  key_takeaways: unknown;
  script_outline: string;
  estimated_duration?: string;
  status: string;
}

interface Props {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  audienceLevel?: string | null;
  prerequisites?: string | null;
  existingBrief: Brief | null;
  /**
   * When true, BriefCard renders without its outer card border + header
   * (breadcrumb + title) because the parent (BriefsView) is already showing
   * those. Pass embedded={true} from BriefsView's expanded accordion row.
   */
  embedded?: boolean;
}

const EMPTY_COACH: CoachInput = {
  key_topics: "", examples: "", visual_requirements: "", difficulty_notes: "", references: "",
  slide_count: "", estimated_minutes: "", objective_override: "",
};

export function BriefCard({
  videoId, videoTitle, lessonTitle, moduleTitle, courseId, audienceLevel, prerequisites, existingBrief, embedded = false,
}: Props) {
  const [brief, setBrief] = useState<Brief | null>(existingBrief);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"brief" | "input">(existingBrief ? "brief" : "input");
  const localKey = `cf:brief-coach-input:${videoId}`;
  const [coachInput, setCoachInput] = useState<CoachInput>(() => {
    if (typeof window === "undefined") return EMPTY_COACH;
    try {
      const raw = window.localStorage.getItem(localKey);
      if (raw) return { ...EMPTY_COACH, ...JSON.parse(raw) } as CoachInput;
    } catch { /* ignore corruption */ }
    return EMPTY_COACH;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        const hasContent = Object.values(coachInput).some((v) => v && String(v).trim());
        if (hasContent) window.localStorage.setItem(localKey, JSON.stringify(coachInput));
        else window.localStorage.removeItem(localKey);
      } catch { /* quota — ignore */ }
    }, 500);
    return () => clearTimeout(t);
  }, [coachInput, localKey]);

  // Suggest panel state
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestFeedback, setSuggestFeedback] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    talking_points: string[]; visual_cues: string[]; key_takeaways: string[]; script_outline: string; rationale: string;
  } | null>(null);
  const [applying, setApplying] = useState(false);

  const isApproved = brief?.status === "approved";

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId, courseId,
          coachInput: hasCoachInput(coachInput) ? {
            key_topics: coachInput.key_topics,
            examples: coachInput.examples,
            visual_requirements: coachInput.visual_requirements,
            difficulty_notes: coachInput.difficulty_notes,
            references: coachInput.references,
            slide_count: coachInput.slide_count ? parseInt(coachInput.slide_count, 10) : undefined,
            estimated_minutes: coachInput.estimated_minutes ? parseInt(coachInput.estimated_minutes, 10) : undefined,
            objective_override: coachInput.objective_override || undefined,
          } : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBrief(data.brief);
        setView("brief");
        setExpanded(true);
        try { window.localStorage.removeItem(localKey); } catch { /* ignore */ }
      } else {
        setError(data.error || "Generation failed");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const toggleApproval = async () => {
    if (!brief) return;
    setApproving(true);
    setError("");
    try {
      const res = await fetch("/api/ai/approve-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, courseId, status: isApproved ? "draft" : "approved" }),
      });
      const data = await res.json();
      if (res.ok) {
        setBrief({ ...brief, status: data.status });
      } else {
        setError(data.error || "Approve failed");
      }
    } catch {
      setError("Network error");
    }
    setApproving(false);
  };

  const requestSuggestion = async () => {
    if (!suggestFeedback.trim()) return;
    setSuggesting(true);
    setError("");
    setSuggestion(null);
    try {
      const res = await fetch("/api/ai/suggest-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, courseId, feedback: suggestFeedback }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || `HTTP ${res.status}`);
      else if (data.suggestion) setSuggestion({ ...data.suggestion, rationale: data.rationale ?? "" });
    } catch (e) { setError((e as Error).message); }
    setSuggesting(false);
  };

  const applySuggestion = async () => {
    if (!suggestion) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ai/suggest-brief", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId, courseId,
          suggestion: {
            talking_points: suggestion.talking_points,
            visual_cues: suggestion.visual_cues,
            key_takeaways: suggestion.key_takeaways,
            script_outline: suggestion.script_outline,
          },
        }),
      });
      if (res.ok) {
        setBrief((prev) => prev ? {
          ...prev,
          talking_points: suggestion.talking_points,
          visual_cues: suggestion.visual_cues,
          key_takeaways: suggestion.key_takeaways,
          script_outline: suggestion.script_outline,
          status: "draft", // edits invalidate approval
        } : prev);
        setSuggestion(null);
        setSuggestFeedback("");
        setSuggestOpen(false);
      }
    } catch (e) { setError((e as Error).message); }
    setApplying(false);
  };

  const toList = (val: unknown): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    return String(val).split("\n").filter((l) => l.trim());
  };

  const hasCoachInput = (ci: CoachInput) => Object.values(ci).some((v) => v.trim().length > 0);
  const updateCoach = (field: keyof CoachInput, value: string) =>
    setCoachInput((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={embedded
      ? "bg-transparent"
      : `rounded-lg border bg-white overflow-hidden ${isApproved ? "border-emerald-300" : "border-slate-200"}`}>
      {/* Header — hidden in embedded mode (BriefsView shows it) */}
      {!embedded && (
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 truncate">
            {moduleTitle} <span className="text-slate-300 mx-1">›</span>
            {lessonTitle} <span className="text-slate-300 mx-1">›</span>
            <span className="text-slate-600">{videoTitle}</span>
          </div>
          <div className="font-medium text-slate-900 truncate">{videoTitle}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-red-500">{error}</span>}

          {brief ? (
            <>
              {isApproved ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                  Draft{brief.estimated_duration && <> · {brief.estimated_duration}</>}
                </span>
              )}

              <button
                onClick={toggleApproval}
                disabled={approving}
                className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 disabled:opacity-40 ${
                  isApproved
                    ? "border-bi-navy-300 text-slate-700 hover:bg-slate-50"
                    : "border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                }`}
                title={isApproved ? "Revoke approval" : "Approve for slide generation"}
              >
                {isApproved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {approving ? "…" : (isApproved ? "Unapprove" : "Approve")}
              </button>

              <button
                onClick={() => setSuggestOpen((v) => !v)}
                title="Suggest improvements"
                className="text-slate-400 hover:text-purple-600 px-2 py-0.5 rounded border border-slate-200 hover:border-purple-300 text-xs inline-flex items-center gap-1"
              >
                <Wand2 className="w-3.5 h-3.5" /> Suggest
              </button>
              <button
                onClick={() => setView(view === "input" ? "brief" : "input")}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-200 hover:border-bi-navy-300"
                title={view === "input" ? "View brief" : "Edit coach input"}
              >
                {view === "input" ? <FileText className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
              </button>
              <button onClick={generate} disabled={loading} title="Regenerate" className="text-slate-400 hover:text-slate-600 disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <button
              onClick={() => setView(view === "input" ? "brief" : "input")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              {view === "input" ? "Hide form" : "Coach input"}
            </button>
          )}
        </div>
      </div>
      )}

      {/* Compact embedded action bar (only when embedded) */}
      {embedded && (
        <div className="flex items-center justify-end gap-2 px-2 pb-2">
          {error && <span className="text-xs text-red-500 mr-auto">{error}</span>}
          {brief && (
            <>
              <button onClick={toggleApproval} disabled={approving} className={`text-xs px-2 py-1 rounded border inline-flex items-center gap-1 disabled:opacity-40 ${isApproved ? "border-bi-navy-300 text-slate-700 hover:bg-slate-50" : "border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`} title={isApproved ? "Revoke approval" : "Approve for slide generation"}>
                {isApproved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {approving ? "…" : (isApproved ? "Unapprove" : "Approve")}
              </button>
              <button onClick={() => setSuggestOpen((v) => !v)} title="Suggest improvements" className="text-slate-400 hover:text-purple-600 px-2 py-0.5 rounded border border-slate-200 hover:border-purple-300 text-xs inline-flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5" /> Suggest
              </button>
              <button onClick={() => setView(view === "input" ? "brief" : "input")} className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-200 hover:border-bi-navy-300" title={view === "input" ? "View brief" : "Edit coach input"}>
                {view === "input" ? <FileText className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
              </button>
              <button onClick={generate} disabled={loading} title="Regenerate" className="text-slate-400 hover:text-slate-600 disabled:opacity-40">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </>
          )}
          {!brief && (
            <button onClick={() => setView(view === "input" ? "brief" : "input")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs hover:bg-slate-200">
              <ClipboardList className="w-3.5 h-3.5" />
              {view === "input" ? "Hide form" : "Coach input"}
            </button>
          )}
        </div>
      )}

      {/* Coach Input Form */}
      {view === "input" && (
        <div className="border-t border-slate-200 px-4 py-4 bg-slate-50/50 space-y-3">
          {/* Course context reminder */}
          {(audienceLevel || prerequisites) && (
            <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-xs space-y-1.5">
              <div className="font-semibold text-blue-900 uppercase tracking-wider">Course Context</div>
              {audienceLevel && (
                <div className="flex gap-2">
                  <span className="font-medium text-blue-700">Audience:</span>
                  <span className="text-blue-900 capitalize">{audienceLevel}</span>
                </div>
              )}
              {prerequisites && (
                <div className="flex gap-2">
                  <span className="font-medium text-blue-700 shrink-0">Prerequisites:</span>
                  <span className="text-blue-900">{prerequisites}</span>
                </div>
              )}
              <div className="text-bi-blue-600/70 italic mt-1">The AI uses this context automatically — no need to repeat.</div>
            </div>
          )}

          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Coach Input — Optional</p>
          <p className="text-xs text-slate-500">Fill in any guidance for the AI. Leave blank to use course context only.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField label="Key Topics to Cover" placeholder="e.g. STP framework, perceptual mapping" value={coachInput.key_topics} onChange={(v) => updateCoach("key_topics", v)} rows={2} />
            <InputField label="Examples & Case Studies" placeholder="e.g. Tesla rebrand, Slack vs Teams positioning" value={coachInput.examples} onChange={(v) => updateCoach("examples", v)} rows={2} />
            <InputField label="Visual Requirements" placeholder="e.g. perceptual map diagram, brand archetype wheel" value={coachInput.visual_requirements} onChange={(v) => updateCoach("visual_requirements", v)} rows={2} />
            <InputField label="Difficulty & Pacing Notes" placeholder="e.g. audience knows marketing basics, slow on segmentation math" value={coachInput.difficulty_notes} onChange={(v) => updateCoach("difficulty_notes", v)} rows={2} />
          </div>
          <InputField label="References & Resources" placeholder="e.g. Building a StoryBrand (Donald Miller, 2017)" value={coachInput.references} onChange={(v) => updateCoach("references", v)} rows={1} />

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Number of Slides"
              placeholder="e.g. 8"
              value={coachInput.slide_count}
              onChange={(v) => updateCoach("slide_count", v)}
              hint="1-60. Leave blank for AI to choose."
            />
            <NumberField
              label="Target Duration (minutes)"
              placeholder="e.g. 12"
              value={coachInput.estimated_minutes}
              onChange={(v) => updateCoach("estimated_minutes", v)}
              hint="1-180. Drives slide count + script pacing."
            />
          </div>

          <InputField
            label="Learning Objective Override"
            placeholder="e.g. After this video, learner should be able to write a positioning statement for a SaaS product"
            value={coachInput.objective_override}
            onChange={(v) => updateCoach("objective_override", v)}
            rows={2}
          />
          <p className="text-[10px] text-slate-400 -mt-1">Leave blank to use the lesson's default learning objectives. Use this to focus the brief on a specific outcome.</p>

          <button onClick={generate} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-bi-navy-700 text-white text-xs hover:bg-bi-navy-800 disabled:opacity-50 transition-colors mt-1">
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Generating…" : brief ? "Regenerate brief" : "Generate brief"}
          </button>
        </div>
      )}

      {/* Brief Output */}
      {brief && view === "brief" && expanded && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-4 text-sm">
          <BriefSection title="Talking Points" items={toList(brief.talking_points)} />
          <BriefSection title="Visual Cues" items={toList(brief.visual_cues)} />
          <BriefSection title="Key Takeaways" items={toList(brief.key_takeaways)} />
          {brief.script_outline && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Script Outline</div>
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-md p-3 border border-slate-200">
                {brief.script_outline}
              </pre>
            </div>
          )}

          {/* AI Suggest panel */}
          {suggestOpen && (
            <div className="rounded-md border border-purple-200 bg-purple-50/40 p-3 space-y-2">
              <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5" /> AI Suggestion
              </div>
              {!suggestion && (
                <>
                  <textarea
                    className="w-full text-xs border border-purple-200 rounded-md px-2.5 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="What should the AI improve? e.g. 'shorten talking points to one line each, add a hands-on Notion example'"
                    value={suggestFeedback} rows={2} onChange={(e) => setSuggestFeedback(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button onClick={requestSuggestion} disabled={!suggestFeedback.trim() || suggesting} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-40">
                      <Sparkles className="w-3 h-3" /> {suggesting ? "Thinking…" : "Get suggestion"}
                    </button>
                    <button onClick={() => { setSuggestOpen(false); setSuggestFeedback(""); }} className="px-3 py-1.5 rounded-md border border-bi-navy-300 text-xs hover:bg-white">Cancel</button>
                  </div>
                </>
              )}
              {suggestion && (
                <div className="space-y-3">
                  {suggestion.rationale && <p className="text-xs text-purple-700 italic">{suggestion.rationale}</p>}
                  <BriefSection title="Suggested Talking Points" items={suggestion.talking_points} />
                  <BriefSection title="Suggested Visual Cues" items={suggestion.visual_cues} />
                  <BriefSection title="Suggested Key Takeaways" items={suggestion.key_takeaways} />
                  {suggestion.script_outline && (
                    <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-white rounded-md p-2 border border-purple-200">{suggestion.script_outline}</pre>
                  )}
                  <div className="flex gap-2">
                    <button onClick={applySuggestion} disabled={applying} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-40">
                      <Check className="w-3 h-3" /> {applying ? "Applying…" : "Apply"}
                    </button>
                    <button onClick={() => setSuggestion(null)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-bi-navy-300 text-xs hover:bg-white">
                      <X className="w-3 h-3" /> Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PPT Export hint */}
          <div className="rounded-md border border-dashed border-bi-navy-300 p-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isApproved
                ? "Brief approved — slides can now be generated for this video."
                : "Approve this brief to unlock slide generation."}
            </p>
            <a href={`/course/${courseId}/ppts`} className="text-xs text-bi-blue-600 hover:underline font-medium">
              Go to PPT tab →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, placeholder, value, onChange, rows = 2 }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <textarea
        className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-bi-blue-400 focus:border-blue-400 placeholder:text-slate-300"
        placeholder={placeholder} value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NumberField({ label, placeholder, value, onChange, hint }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        min={1}
        max={180}
        className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-bi-blue-400 focus:border-blue-400 placeholder:text-slate-300"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{title}</div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-slate-700">
            <span className="text-blue-400 shrink-0 mt-0.5">·</span>
            <span>{item.replace(/^[-•·]\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
