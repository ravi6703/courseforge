"use client";

import { useMemo, useState } from "react";
import { Sparkles, Check, X, Loader2, MessageSquare } from "lucide-react";

type Module = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  learning_objectives?: unknown;
};
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  order: number;
  content_types?: string[];
};
type Comment = {
  id: string;
  target_type: string;
  target_id: string;
  text: string;
  author_name?: string | null;
  author_role?: string | null;
  resolved: boolean;
  is_ai_flag: boolean;
  created_at: string;
};
type Suggestion = {
  title: string;
  description: string;
  rationale: string;
};

function SuggestButton({
  courseId,
  itemType,
  itemId,
  currentTitle,
  currentDescription,
  moduleTitle,
  courseTitle,
  onApply,
}: {
  courseId: string;
  itemType: "module" | "lesson";
  itemId: string;
  currentTitle: string;
  currentDescription?: string | null;
  moduleTitle?: string;
  courseTitle?: string;
  onApply: (title: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");
    setSuggestion(null);
    try {
      const res = await fetch("/api/ai/suggest-toc-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          itemType,
          itemId,
          currentTitle,
          currentDescription,
          feedback,
          moduleTitle,
          courseTitle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuggestion(data.suggestion);
      } else {
        setError("Failed to generate suggestion");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const handleApply = () => {
    if (!suggestion) return;
    onApply(suggestion.title, suggestion.description);
    setOpen(false);
    setFeedback("");
    setSuggestion(null);
  };

  const handleDiscard = () => {
    setOpen(false);
    setFeedback("");
    setSuggestion(null);
    setError("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50"
        title="AI suggestion"
      >
        <Sparkles className="w-3 h-3" />
        <span>Suggest</span>
      </button>
    );
  }

  return (
    <div className="mt-2 ml-6 mr-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI Suggestion
        </span>
        <button onClick={handleDiscard} className="text-slate-400 hover:text-slate-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!suggestion ? (
        <>
          <textarea
            className="w-full text-xs border border-blue-200 rounded px-2 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Describe what to improve (e.g. 'make it more practical', 'add real-world examples', 'simplify the title')…"
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading || !feedback.trim()}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loading ? "Generating…" : "Get suggestion"}
          </button>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">Suggested title:</p>
            <p className="text-xs text-slate-900 bg-white border border-slate-200 rounded px-2 py-1">{suggestion.title}</p>
            {suggestion.description && (
              <>
                <p className="text-xs font-medium text-slate-700 mt-1.5">Description:</p>
                <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-1">{suggestion.description}</p>
              </>
            )}
            <p className="text-xs text-blue-600 italic mt-1">{suggestion.rationale}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700 transition-colors"
            >
              <Check className="w-3 h-3" /> Apply
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 text-slate-600 text-xs hover:bg-slate-100 transition-colors"
            >
              <X className="w-3 h-3" /> Retry
            </button>
            <button
              onClick={handleDiscard}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600"
            >
              Discard
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TocTree({
  courseId,
  modules,
  lessons,
  comments,
  videoCountByModule,
}: {
  courseId: string;
  modules: Module[];
  lessons: Lesson[];
  comments: Comment[];
  videoCountByModule?: Record<string, number>;
}) {
  const [localModules, setLocalModules] = useState<Module[]>(modules);
  const [localLessons, setLocalLessons] = useState<Lesson[]>(lessons);

  const lessonsByModule = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    localLessons.forEach((l) => (m[l.module_id] = m[l.module_id] || []).push(l));
    return m;
  }, [localLessons]);

  const commentsByTarget = useMemo(() => {
    const m: Record<string, Comment[]> = {};
    comments.forEach((c) => {
      const k = `${c.target_type}:${c.target_id}`;
      (m[k] = m[k] || []).push(c);
    });
    return m;
  }, [comments]);

  const [openModule, setOpenModule] = useState<string | null>(localModules[0]?.id ?? null);

  const unresolvedTotal = comments.filter((c) => !c.resolved).length;

  const applyModuleSuggestion = async (moduleId: string, title: string, description: string) => {
    setLocalModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, title, description } : m))
    );
    await fetch(`/api/courses/${courseId}/update-item`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "modules", id: moduleId, title, description }),
    }).catch(() => {});
  };

  const applyLessonSuggestion = async (lessonId: string, title: string, description: string) => {
    setLocalLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, title, description } : l))
    );
    await fetch(`/api/courses/${courseId}/update-item`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "lessons", id: lessonId, title, description }),
    }).catch(() => {});
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Table of Contents</h2>
        <div className="flex items-center gap-2 text-sm">
          {unresolvedTotal > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
              {unresolvedTotal} unresolved
            </span>
          )}
          <button
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-40"
            onClick={async () => {
              await fetch("/api/ai/improve-toc", {
                method: "POST",
                body: JSON.stringify({ courseId }),
              });
              location.reload();
            }}
            disabled={unresolvedTotal === 0}
            title={
              unresolvedTotal === 0
                ? "Resolve at least one comment first"
                : "Send all unresolved comments to AI for rewrite"
            }
          >
            <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
            Apply All Feedback
          </button>
        </div>
      </div>

      <ol className="divide-y divide-slate-100">
        {localModules.map((m, idx) => {
          const open = openModule === m.id;
          const ls = lessonsByModule[m.id] || [];
          const moduleComments = commentsByTarget[`module:${m.id}`] || [];
          return (
            <li key={m.id}>
              <div>
                <button
                  onClick={() => setOpenModule(open ? null : m.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-slate-400">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-slate-900 truncate">{m.title}{videoCountByModule && videoCountByModule[m.id] !== undefined && (
                  <span className="ml-2 text-xs text-slate-400 font-normal">({videoCountByModule[m.id]} video{videoCountByModule[m.id] === 1 ? "" : "s"})</span>
                )}</span>
                    {m.description && (
                      <span className="text-xs text-slate-400 truncate hidden sm:block max-w-xs">
                        — {m.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <span>{ls.length} lessons</span>
                    {moduleComments.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        {moduleComments.filter((c) => !c.resolved).length} comments
                      </span>
                    )}
                    <span>{open ? "▾" : "▸"}</span>
                  </div>
                </button>

                <SuggestButton
                  courseId={courseId}
                  itemType="module"
                  itemId={m.id}
                  currentTitle={m.title}
                  currentDescription={m.description}
                  onApply={(title, desc) => applyModuleSuggestion(m.id, title, desc)}
                />
              </div>

              {open && (
                <ul className="bg-slate-50/50 border-t border-slate-100">
                  {ls.map((l) => {
                    const lc = commentsByTarget[`lesson:${l.id}`] || [];
                    return (
                      <li key={l.id} className="border-b border-slate-100 last:border-b-0">
                        <div className="px-6 py-2.5 text-sm flex justify-between items-start">
                          <span className="text-slate-800 flex-1">{l.title}</span>
                          <span className="text-xs text-slate-500 shrink-0 ml-3">
                            {(l.content_types || []).join(" · ") || "—"}
                            {lc.length > 0 && (
                              <span className="ml-2 text-amber-700">
                                {lc.filter((c) => !c.resolved).length}c
                              </span>
                            )}
                          </span>
                        </div>
                        <SuggestButton
                          courseId={courseId}
                          itemType="lesson"
                          itemId={l.id}
                          currentTitle={l.title}
                          currentDescription={l.description}
                          moduleTitle={m.title}
                          onApply={(title, desc) => applyLessonSuggestion(l.id, title, desc)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
