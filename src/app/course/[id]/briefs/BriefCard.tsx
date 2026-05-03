"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, RefreshCw, ClipboardList, FileText, Wand2, Check, X } from "lucide-react";

interface CoachInput {
  key_topics: string;
  examples: string;
  visual_requirements: string;
  difficulty_notes: string;
  references: string;
}

interface Brief {
  talking_points: unknown;
  visual_cues: unknown;
  key_takeaways: unknown;
  script_outline: string;
  estimated_duration?: string;
  status: string;
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  existingBrief: Brief | null;
}

const EMPTY_COACH: CoachInput = {
  key_topics: "",
  examples: "",
  visual_requirements: "",
  difficulty_notes: "",
  references: "",
};

export function BriefCard({
  lessonId,
  lessonTitle,
  moduleTitle,
  courseId,
  courseTitle,
  existingBrief,
}: Props) {
  const [brief, setBrief] = useState<Brief | null>(existingBrief);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"brief" | "input">(existingBrief ? "brief" : "input");
  const [coachInput, setCoachInput] = useState<CoachInput>(EMPTY_COACH);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestFeedback, setSuggestFeedback] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ talking_points: string[]; visual_cues: string[]; key_takeaways: string[]; script_outline: string; rationale: string } | null>(null);
  const [applying, setApplying] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          courseId,
          lessonTitle,
          moduleTitle,
          courseTitle,
          videoTitle: lessonTitle,
          coachInput: hasCoachInput(coachInput) ? coachInput : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBrief(data.brief);
        setView("brief");
        setExpanded(true);
      } else {
        setError("Generation failed");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
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
        body: JSON.stringify({ lessonId, courseId, feedback: suggestFeedback }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else if (data.suggestion) {
        setSuggestion({ ...data.suggestion, rationale: data.rationale ?? "" });
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setSuggesting(false);
  };

  const applySuggestion = async () => {
    if (!suggestion) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ai/suggest-brief", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, courseId, suggestion: {
          talking_points: suggestion.talking_points,
          visual_cues: suggestion.visual_cues,
          key_takeaways: suggestion.key_takeaways,
          script_outline: suggestion.script_outline,
        }}),
      });
      if (res.ok) {
        // Update the visible brief in place so the user sees the change immediately
        setBrief((prev) => prev ? {
          ...prev,
          talking_points: suggestion.talking_points,
          visual_cues: suggestion.visual_cues,
          key_takeaways: suggestion.key_takeaways,
          script_outline: suggestion.script_outline,
        } : prev);
        setSuggestion(null);
        setSuggestFeedback("");
        setSuggestOpen(false);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setApplying(false);
  };

  const toList = (val: unknown): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    return String(val).split("\n").filter((l) => l.trim());
  };

  const hasCoachInput = (ci: CoachInput) =>
    Object.values(ci).some((v) => v.trim().length > 0);

  const updateCoach = (field: keyof CoachInput, value: string) =>
    setCoachInput((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 truncate">{moduleTitle}</div>
          <div className="font-medium text-slate-900 truncate">{lessonTitle}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-red-500">{error}</span>}

          {brief ? (
            <>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                Brief ready
                {brief.estimated_duration && (
                  <span className="ml-1 text-blue-500">· {brief.estimated_duration}</span>
                )}
              </span>
              <button
                onClick={() => setView(view === "input" ? "brief" : "input")}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300"
                title={view === "input" ? "View brief" : "Edit coach input"}
              >
                {view === "input" ? (
                  <><FileText className="w-3.5 h-3.5 inline mr-1" />View</>
                ) : (
                  <><ClipboardList className="w-3.5 h-3.5 inline mr-1" />Input</>
                )}
              </button>
              <button
                onClick={() => setSuggestOpen((v) => !v)}
                title="Suggest improvements"
                className="text-slate-400 hover:text-purple-600 px-2 py-0.5 rounded border border-slate-200 hover:border-purple-300 text-xs inline-flex items-center gap-1"
              >
                <Wand2 className="w-3.5 h-3.5" /> Suggest
              </button>
              <button
                onClick={generate}
                disabled={loading}
                title="Regenerate"
                className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-400 hover:text-slate-600"
              >
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

      {/* Coach Input Form */}
      {view === "input" && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Coach Input — Optional
          </p>
          <p className="text-xs text-slate-500">
            Fill in any guidance for the AI. Leave blank to use course context only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Key Topics to Cover"
              placeholder="e.g. LSTM networks, vanishing gradient, backprop through time"
              value={coachInput.key_topics}
              onChange={(v) => updateCoach("key_topics", v)}
              rows={2}
            />
            <InputField
              label="Examples & Case Studies"
              placeholder="e.g. Netflix recommendation engine, GPT token prediction"
              value={coachInput.examples}
              onChange={(v) => updateCoach("examples", v)}
              rows={2}
            />
            <InputField
              label="Visual Requirements"
              placeholder="e.g. animated diagram of attention mechanism, comparison table"
              value={coachInput.visual_requirements}
              onChange={(v) => updateCoach("visual_requirements", v)}
              rows={2}
            />
            <InputField
              label="Difficulty & Pacing Notes"
              placeholder="e.g. audience has basic Python, slow down on math derivations"
              value={coachInput.difficulty_notes}
              onChange={(v) => updateCoach("difficulty_notes", v)}
              rows={2}
            />
          </div>
          <InputField
            label="References & Resources"
            placeholder="e.g. Attention Is All You Need (2017), Stanford CS224N lecture 8"
            value={coachInput.references}
            onChange={(v) => updateCoach("references", v)}
            rows={1}
          />

          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors mt-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Generating…" : brief ? "Regenerate brief" : "Generate brief"}
          </button>
        </div>
      )}

      {/* Brief Output */}
      {brief && view === "brief" && expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 text-sm">
          <BriefSection title="Talking Points" items={toList(brief.talking_points)} />
          <BriefSection title="Visual Cues" items={toList(brief.visual_cues)} />
          <BriefSection title="Key Takeaways" items={toList(brief.key_takeaways)} />
          {brief.script_outline && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Script Outline
              </div>
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
                    value={suggestFeedback}
                    rows={2}
                    onChange={(e) => setSuggestFeedback(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={requestSuggestion}
                      disabled={!suggestFeedback.trim() || suggesting}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3" />
                      {suggesting ? "Thinking…" : "Get suggestion"}
                    </button>
                    <button
                      onClick={() => { setSuggestOpen(false); setSuggestFeedback(""); }}
                      className="px-3 py-1.5 rounded-md border border-slate-300 text-xs hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
              {suggestion && (
                <div className="space-y-3">
                  {suggestion.rationale && (
                    <p className="text-xs text-purple-700 italic">{suggestion.rationale}</p>
                  )}
                  <BriefSection title="Suggested Talking Points" items={suggestion.talking_points} />
                  <BriefSection title="Suggested Visual Cues" items={suggestion.visual_cues} />
                  <BriefSection title="Suggested Key Takeaways" items={suggestion.key_takeaways} />
                  {suggestion.script_outline && (
                    <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-white rounded-md p-2 border border-purple-200">
                      {suggestion.script_outline}
                    </pre>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={applySuggestion}
                      disabled={applying}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Check className="w-3 h-3" /> {applying ? "Applying…" : "Apply"}
                    </button>
                    <button
                      onClick={() => setSuggestion(null)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-xs hover:bg-white"
                    >
                      <X className="w-3 h-3" /> Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PPT Export hint */}
          <div className="rounded-md border border-dashed border-slate-300 p-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">Ready to create slides from this brief?</p>
            <a
              href={`/course/${courseId}/ppts`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Go to PPT tab →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <textarea
        className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-300"
        placeholder={placeholder}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {title}
      </div>
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
