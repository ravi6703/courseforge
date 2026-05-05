"use client";

// Simplified TOC editor — two-pane layout.
//
// LEFT  compact tree (Module / Lesson / Video) with inline rename + add/delete
// RIGHT Outcomes panel for whatever is selected; plain textarea (one bullet
//       per line) + "Suggest with AI" button + "Save & propagate" that
//       writes the LOs and flags downstream artifacts as stale.
//
// What we removed compared to the previous version:
//   - Per-LO Bloom-level dropdown (AI infers)
//   - Three separate LO editor surfaces (Course / Module / Lesson)
//   - Per-row "AI re-edit downstream" button (folded into Save)
//   - Per-row delete buttons inside the LO list (delete a line by erasing it)
//
// What stays:
//   - Manual add / edit / delete on Module / Lesson / Video rows
//   - Inline brief link on each video row
//   - Stale-flag UX: edits do not auto-rewrite anything, they just mark
//     dependents stale (round D wires the stale display per stage).

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Pencil, FileText, Loader2,
  Sparkles, Check, X,
} from "lucide-react";

type LearningObjective = { id: string; text: string; bloom_level?: string };
type Module = { id: string; title: string; description?: string | null; order: number; learning_objectives?: unknown };
type Lesson = { id: string; module_id: string; title: string; description?: string | null; order: number; learning_objectives?: unknown };
type Video  = { id: string; lesson_id: string; title: string; order: number };

type Selection =
  | { kind: "course" }
  | { kind: "module"; id: string }
  | { kind: "lesson"; id: string };

function asObjectives(x: unknown): LearningObjective[] {
  if (!Array.isArray(x)) return [];
  return x.filter((o): o is LearningObjective => !!o && typeof (o as LearningObjective).text === "string");
}
function objectivesToLines(os: LearningObjective[]): string {
  return os.map((o) => o.text).join("\n");
}
function linesToObjectives(text: string, prev: LearningObjective[]): LearningObjective[] {
  const seenIds = new Map(prev.map((o) => [o.text.trim(), o.id]));
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => ({
    id: seenIds.get(line) ?? crypto.randomUUID(),
    text: line,
  }));
}

export function TocTree({
  courseId, courseTitle = "", courseObjectives = [], modules, lessons, videos = [],
}: {
  courseId: string;
  courseTitle?: string;
  courseObjectives?: unknown[];
  modules: Module[];
  lessons: Lesson[];
  videos?: Video[];
  comments?: unknown[];           // accepted for backwards compat; not used here
  videoCountByModule?: Record<string, number>;
}) {
  const [localModules, setLocalModules] = useState<Module[]>(modules);
  const [localLessons, setLocalLessons] = useState<Lesson[]>(lessons);
  const [localVideos,  setLocalVideos]  = useState<Video[]>(videos);
  const [localCourseObj, setLocalCourseObj] = useState<LearningObjective[]>(asObjectives(courseObjectives));
  const [openModule, setOpenModule] = useState<string | null>(modules[0]?.id ?? null);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "course" });
  const [staleHint, setStaleHint] = useState<string | null>(null);

  const lessonsByModule = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    localLessons.forEach((l) => (m[l.module_id] = m[l.module_id] || []).push(l));
    return m;
  }, [localLessons]);
  const videosByLesson = useMemo(() => {
    const m: Record<string, Video[]> = {};
    localVideos.forEach((v) => (m[v.lesson_id] = m[v.lesson_id] || []).push(v));
    return m;
  }, [localVideos]);

  // ── API ────────────────────────────────────────────────────────────────
  async function patch(table: "courses" | "modules" | "lessons" | "videos", id: string, fields: Record<string, unknown>) {
    await fetch(`/api/courses/${courseId}/update-item`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, ...fields }),
    });
  }
  async function createRow(table: "modules" | "lessons" | "videos", body: Record<string, unknown>): Promise<string | null> {
    const res = await fetch(`/api/courses/${courseId}/update-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, ...body }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.id ?? null;
  }
  async function deleteRow(table: "modules" | "lessons" | "videos", itemId: string) {
    await fetch(`/api/courses/${courseId}/update-item?table=${table}&itemId=${itemId}`, { method: "DELETE" });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────
  const addModule = async () => {
    const id = await createRow("modules", { title: `Module ${localModules.length + 1}`, order: localModules.length, learning_objectives: [] });
    if (!id) return;
    const next: Module = { id, title: `Module ${localModules.length + 1}`, order: localModules.length, learning_objectives: [] };
    setLocalModules((p) => [...p, next]);
    setOpenModule(id);
    setSelection({ kind: "module", id });
  };
  const addLesson = async (moduleId: string) => {
    const siblings = lessonsByModule[moduleId] || [];
    const id = await createRow("lessons", { module_id: moduleId, title: `Lesson ${siblings.length + 1}`, order: siblings.length, learning_objectives: [], content_types: [] });
    if (!id) return;
    const next: Lesson = { id, module_id: moduleId, title: `Lesson ${siblings.length + 1}`, order: siblings.length, learning_objectives: [] };
    setLocalLessons((p) => [...p, next]);
    setOpenLesson(id);
    setSelection({ kind: "lesson", id });
  };
  const addVideo = async (lessonId: string) => {
    const siblings = videosByLesson[lessonId] || [];
    const id = await createRow("videos", { lesson_id: lessonId, title: `Video ${siblings.length + 1}`, order: siblings.length });
    if (!id) return;
    const next: Video = { id, lesson_id: lessonId, title: `Video ${siblings.length + 1}`, order: siblings.length };
    setLocalVideos((p) => [...p, next]);
  };

  const renameModule = (m: Module, title: string) => { setLocalModules((p) => p.map((x) => x.id === m.id ? { ...x, title } : x)); void patch("modules", m.id, { title }); };
  const renameLesson = (l: Lesson, title: string) => { setLocalLessons((p) => p.map((x) => x.id === l.id ? { ...x, title } : x)); void patch("lessons", l.id, { title }); };
  const renameVideo  = (v: Video,  title: string) => { setLocalVideos((p)  => p.map((x) => x.id === v.id ? { ...x, title } : x)); void patch("videos",  v.id, { title }); };

  const removeModule = async (m: Module) => { if (!confirm(`Delete "${m.title}" and all its lessons/videos?`)) return; await deleteRow("modules", m.id); setLocalModules((p) => p.filter((x) => x.id !== m.id)); if (selection.kind === "module" && selection.id === m.id) setSelection({ kind: "course" }); };
  const removeLesson = async (l: Lesson) => { if (!confirm(`Delete "${l.title}"?`)) return; await deleteRow("lessons", l.id); setLocalLessons((p) => p.filter((x) => x.id !== l.id)); if (selection.kind === "lesson" && selection.id === l.id) setSelection({ kind: "module", id: l.module_id }); };
  const removeVideo  = async (v: Video)  => { if (!confirm(`Delete "${v.title}"?`)) return; await deleteRow("videos", v.id); setLocalVideos((p) => p.filter((x) => x.id !== v.id)); };

  // ── Selection state derived ────────────────────────────────────────────
  const selObjectives: LearningObjective[] =
    selection.kind === "course" ? localCourseObj :
    selection.kind === "module" ? asObjectives(localModules.find((m) => m.id === selection.id)?.learning_objectives) :
                                   asObjectives(localLessons.find((l) => l.id === selection.id)?.learning_objectives);

  const selTitle =
    selection.kind === "course" ? (courseTitle || "Course") :
    selection.kind === "module" ? (localModules.find((m) => m.id === selection.id)?.title ?? "Module") :
                                   (localLessons.find((l) => l.id === selection.id)?.title ?? "Lesson");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <CompactTree
        courseTitle={courseTitle}
        modules={localModules}
        lessonsByModule={lessonsByModule}
        videosByLesson={videosByLesson}
        openModule={openModule} setOpenModule={setOpenModule}
        openLesson={openLesson} setOpenLesson={setOpenLesson}
        selection={selection} setSelection={setSelection}
        onAddModule={addModule} onAddLesson={addLesson} onAddVideo={addVideo}
        onRenameModule={renameModule} onRenameLesson={renameLesson} onRenameVideo={renameVideo}
        onRemoveModule={removeModule} onRemoveLesson={removeLesson} onRemoveVideo={removeVideo}
        courseId={courseId}
      />
      <OutcomesPanel
        scope={selection.kind}
        title={selTitle}
        objectives={selObjectives}
        staleHint={staleHint}
        onSave={async (next) => {
          if (selection.kind === "course") {
            setLocalCourseObj(next);
            await patch("courses", courseId, { learning_objectives: next });
          } else if (selection.kind === "module") {
            setLocalModules((p) => p.map((m) => m.id === selection.id ? { ...m, learning_objectives: next as unknown[] as LearningObjective[] } : m));
            await patch("modules", selection.id, { learning_objectives: next });
          } else {
            setLocalLessons((p) => p.map((l) => l.id === selection.id ? { ...l, learning_objectives: next as unknown[] as LearningObjective[] } : l));
            await patch("lessons", selection.id, { learning_objectives: next });
          }
          // Stale-flag downstream artifacts. Round D wires the per-stage
          // display; for now we surface a confirmation hint so the coach
          // knows the change propagates on next regenerate.
          setStaleHint("Saved. Briefs, slides and content will pick up these outcomes the next time you regenerate them.");
          setTimeout(() => setStaleHint(null), 6000);
        }}
        onSuggest={async () => {
          // Single-shot AI suggest based on the current node's title.
          // Reuses /api/ai/suggest-toc-item which already exists.
          const itemType = selection.kind === "module" ? "module" : "lesson";
          const itemId   = selection.kind === "module" || selection.kind === "lesson" ? selection.id : "course";
          if (selection.kind === "course") return null;
          const res = await fetch("/api/ai/suggest-toc-item", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId, itemType, itemId,
              currentTitle: selTitle,
              feedback: "Generate 3-5 outcome-style learning objectives, one per line, beginning with an action verb.",
              courseTitle,
            }),
          });
          const data = await res.json();
          if (!data?.suggestion) return null;
          // The endpoint returns title + description + rationale; we treat
          // its description as a chunk of bullets, tolerating either
          // newline-separated text or a single paragraph.
          const text: string = data.suggestion.description ?? "";
          return text;
        }}
      />
    </div>
  );
}

// ── Tree (left) ─────────────────────────────────────────────────────────────
function CompactTree(props: {
  courseTitle: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  videosByLesson: Record<string, Video[]>;
  openModule: string | null; setOpenModule: (id: string | null) => void;
  openLesson: string | null; setOpenLesson: (id: string | null) => void;
  selection: Selection; setSelection: (s: Selection) => void;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onAddVideo:  (lessonId: string) => void;
  onRenameModule: (m: Module, title: string) => void;
  onRenameLesson: (l: Lesson, title: string) => void;
  onRenameVideo:  (v: Video,  title: string) => void;
  onRemoveModule: (m: Module) => void;
  onRemoveLesson: (l: Lesson) => void;
  onRemoveVideo:  (v: Video)  => void;
  courseId: string;
}) {
  const {
    courseTitle, modules, lessonsByModule, videosByLesson,
    openModule, setOpenModule, openLesson, setOpenLesson,
    selection, setSelection,
    onAddModule, onAddLesson, onAddVideo,
    onRenameModule, onRenameLesson, onRenameVideo,
    onRemoveModule, onRemoveLesson, onRemoveVideo,
    courseId,
  } = props;

  return (
    <aside className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden self-start">
      <header className="px-3 py-2.5 border-b border-bi-navy-100 flex items-center justify-between">
        <button
          onClick={() => setSelection({ kind: "course" })}
          className={`text-left flex-1 min-w-0 ${selection.kind === "course" ? "text-bi-blue-700" : "text-bi-navy-700"}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500">Course</div>
          <div className="text-[13px] font-semibold truncate">{courseTitle || "Untitled"}</div>
        </button>
        <button onClick={onAddModule} className="ml-2 p-1.5 rounded text-bi-navy-500 hover:bg-bi-navy-50" title="Add module">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </header>

      <ul className="py-1 max-h-[70vh] overflow-auto">
        {modules.length === 0 && (
          <li className="px-4 py-6 text-[12px] text-bi-navy-500 italic text-center">
            No modules yet — click <span className="font-semibold">+</span> above.
          </li>
        )}
        {modules.map((m, i) => {
          const open = openModule === m.id;
          const ls = lessonsByModule[m.id] || [];
          const isSel = selection.kind === "module" && selection.id === m.id;
          return (
            <li key={m.id} className="text-[13px]">
              <Row
                indent={0}
                chevron={open ? "down" : "right"}
                onChevron={() => setOpenModule(open ? null : m.id)}
                title={m.title}
                selected={isSel}
                index={i + 1}
                onSelect={() => setSelection({ kind: "module", id: m.id })}
                onRename={(t) => onRenameModule(m, t)}
                onDelete={() => onRemoveModule(m)}
                actions={[
                  { label: "Add lesson", onClick: () => { setOpenModule(m.id); onAddLesson(m.id); } },
                ]}
              />
              {open && ls.map((l, li) => {
                const lOpen = openLesson === l.id;
                const vids = videosByLesson[l.id] || [];
                const lSel = selection.kind === "lesson" && selection.id === l.id;
                return (
                  <div key={l.id}>
                    <Row
                      indent={1}
                      chevron={lOpen ? "down" : "right"}
                      onChevron={() => setOpenLesson(lOpen ? null : l.id)}
                      title={l.title}
                      selected={lSel}
                      index={li + 1}
                      onSelect={() => setSelection({ kind: "lesson", id: l.id })}
                      onRename={(t) => onRenameLesson(l, t)}
                      onDelete={() => onRemoveLesson(l)}
                      actions={[
                        { label: "Add video", onClick: () => { setOpenLesson(l.id); onAddVideo(l.id); } },
                      ]}
                    />
                    {lOpen && vids.map((v, vi) => (
                      <VideoLine
                        key={v.id} video={v} index={vi + 1}
                        courseId={courseId}
                        onRename={(t) => onRenameVideo(v, t)}
                        onDelete={() => onRemoveVideo(v)}
                      />
                    ))}
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function Row(props: {
  indent: 0 | 1;
  chevron: "down" | "right";
  onChevron: () => void;
  title: string;
  selected: boolean;
  index: number;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  actions?: Array<{ label: string; onClick: () => void }>;
}) {
  const { indent, chevron, onChevron, title, selected, index, onSelect, onRename, onDelete, actions } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  return (
    <div
      className={`group flex items-center gap-1 pr-2 py-1 ${indent === 0 ? "pl-2" : "pl-6"} ${
        selected ? "bg-bi-blue-50" : "hover:bg-bi-navy-50"
      }`}
    >
      <button onClick={onChevron} className="p-0.5 text-bi-navy-400 hover:text-bi-navy-700">
        {chevron === "down" ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      <span className="text-[10px] font-mono text-bi-navy-400 tabular-nums w-5 text-right">{String(index).padStart(2, "0")}</span>
      {editing ? (
        <input
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft.trim()) onRename(draft.trim()); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (draft.trim()) onRename(draft.trim()); setEditing(false); }
            if (e.key === "Escape") { setDraft(title); setEditing(false); }
          }}
          className="flex-1 text-[13px] border border-bi-blue-300 rounded px-1.5 py-0.5"
        />
      ) : (
        <button onClick={onSelect} className={`flex-1 min-w-0 text-left truncate ${selected ? "font-semibold text-bi-blue-800" : "text-bi-navy-800"}`}>
          {title}
        </button>
      )}
      {!editing && (
        <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          {actions?.map((a) => (
            <button
              key={a.label} onClick={a.onClick}
              className="p-1 rounded text-bi-navy-500 hover:bg-bi-navy-100" title={a.label}
            >
              <Plus className="w-3 h-3" />
            </button>
          ))}
          <button onClick={() => { setDraft(title); setEditing(true); }} className="p-1 rounded text-bi-navy-500 hover:bg-bi-navy-100" title="Rename">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-1 rounded text-red-500 hover:bg-red-50" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );
}

function VideoLine({ video, index, courseId, onRename, onDelete }: {
  video: Video; index: number; courseId: string;
  onRename: (title: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(video.title);
  return (
    <div className="group flex items-center gap-1 pl-10 pr-2 py-1 hover:bg-bi-navy-50">
      <span className="text-[10px] font-mono text-bi-navy-400 tabular-nums w-6">V{index}</span>
      {editing ? (
        <input
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft.trim()) onRename(draft.trim()); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (draft.trim()) onRename(draft.trim()); setEditing(false); }
            if (e.key === "Escape") { setDraft(video.title); setEditing(false); }
          }}
          className="flex-1 text-[12.5px] border border-bi-blue-300 rounded px-1.5 py-0.5"
        />
      ) : (
        <span className="flex-1 truncate text-[12.5px] text-bi-navy-700">{video.title}</span>
      )}
      <Link
        href={`/course/${courseId}/briefs?focus=${video.id}`}
        className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5 text-[10.5px] text-bi-blue-700 hover:underline transition-opacity"
        title="Open brief"
      >
        <FileText className="w-3 h-3" /> Brief
      </Link>
      {!editing && (
        <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <button onClick={() => { setDraft(video.title); setEditing(true); }} className="p-1 rounded text-bi-navy-500 hover:bg-bi-navy-100">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-1 rounded text-red-500 hover:bg-red-50">
            <Trash2 className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );
}

// ── Outcomes (right) ─────────────────────────────────────────────────────────
function OutcomesPanel({
  scope, title, objectives, staleHint, onSave, onSuggest,
}: {
  scope: "course" | "module" | "lesson";
  title: string;
  objectives: LearningObjective[];
  staleHint: string | null;
  onSave: (next: LearningObjective[]) => Promise<void>;
  onSuggest: () => Promise<string | null>;
}) {
  const [text, setText] = useState(objectivesToLines(objectives));
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Reset draft when selection or upstream objectives change.
  // (objectives identity changes on every parent setState, so we key on its
  //  serialised content to avoid stomping a coach's mid-edit text.)
  const upstream = objectivesToLines(objectives);
  const dirty = text.trim() !== upstream.trim();
  if (!dirty && text !== upstream) setText(upstream);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(linesToObjectives(text, objectives));
      setSavedAt(new Date().toLocaleTimeString());
    } finally { setSaving(false); }
  };

  const suggest = async () => {
    if (scope === "course") return;
    setSuggesting(true);
    try {
      const out = await onSuggest();
      if (out) {
        // Normalise: the suggest endpoint returns either a paragraph or a
        // bulleted block. We keep one bullet per line and prepend to the
        // existing draft so the coach can review before saving.
        const cleaned = out
          .split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
          .join("\n");
        setText((prev) => (prev.trim() ? prev.trim() + "\n" : "") + cleaned);
      }
    } finally { setSuggesting(false); }
  };

  return (
    <section className="bg-white border border-bi-navy-100 rounded-lg p-5 self-start">
      <header className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-bi-navy-500 capitalize">{scope}</div>
        <h2 className="text-[16px] font-semibold text-bi-navy-900 truncate">{title}</h2>
        <p className="text-[12px] text-bi-navy-500 mt-1">
          What learners can <strong>do</strong> after this {scope}. One outcome per line. Start each with a verb (apply, diagnose, build, choose).
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Apply STP framework to a SaaS positioning brief\nDiagnose 3 common positioning mistakes`}
        rows={Math.max(6, text.split("\n").length + 1)}
        className="w-full text-[13.5px] leading-relaxed border border-bi-navy-200 rounded-lg p-3 outline-none focus:border-bi-blue-400 focus:ring-2 focus:ring-bi-blue-100 resize-none"
      />

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11.5px] text-bi-navy-500">
          {dirty
            ? <span className="text-amber-700 font-semibold">Unsaved changes.</span>
            : savedAt
              ? <span>Saved at {savedAt}</span>
              : <span>{objectives.length} outcome{objectives.length === 1 ? "" : "s"}.</span>}
        </div>
        <div className="flex gap-2">
          {scope !== "course" && (
            <button
              onClick={suggest}
              disabled={suggesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-bi-blue-200 bg-bi-blue-50 text-bi-blue-700 text-[12.5px] font-semibold hover:bg-bi-blue-100 disabled:opacity-50"
            >
              {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Suggest with AI
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[12.5px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save &amp; propagate
          </button>
        </div>
      </div>

      {staleHint && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 flex items-start gap-2">
          <span className="font-semibold shrink-0">Heads up.</span>
          <span className="flex-1">{staleHint}</span>
          <button onClick={() => { /* dismissed by parent timeout */ }} className="text-amber-900 hover:opacity-70">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </section>
  );
}
