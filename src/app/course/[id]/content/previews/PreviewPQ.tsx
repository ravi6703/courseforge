// Practice Questions preview — formative quiz, learner sees rationale per Q
// immediately. Schema: { questions: [{ id, type, stem, options?, correct,
// explanation, difficulty, bloom }] } with 5–10 questions.

interface PQQuestion {
  id: string;
  type: "mcq" | "short";
  stem: string;
  options?: string[];
  correct: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  bloom: "recall" | "understand" | "apply" | "analyze";
}

export function PreviewPQ({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <Empty />;
  const questions = (payload.questions as PQQuestion[] | undefined) ?? [];
  if (questions.length === 0) return <Empty />;

  const counts = countByDifficulty(questions);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-slate-700">Practice quiz · {questions.length} questions</h3>
        <div className="text-xs text-slate-500">
          {counts.easy} easy · {counts.medium} medium · {counts.hard} hard
        </div>
      </div>

      <div className="space-y-2">
        {questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} idx={idx + 1} />
        ))}
      </div>
    </div>
  );
}

export function QuestionCard({ q, idx, weight }: { q: PQQuestion; idx: number; weight?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-semibold text-sm text-slate-900">
          Q{idx} · {q.stem}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
          {weight !== undefined && (
            <span className="px-1.5 py-[1px] rounded-full bg-bi-blue-100 text-bi-blue-700 font-bold">
              {weight} pts
            </span>
          )}
          <span className="px-1.5 py-[1px] rounded-full bg-slate-200 text-slate-700 font-medium uppercase tracking-wide">
            {q.type}
          </span>
          <DiffPill d={q.difficulty} />
          <BloomPill b={q.bloom} />
        </div>
      </div>

      {q.type === "mcq" && q.options && (
        <ul className="mt-2 space-y-0.5 text-sm">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isCorrect = opt === q.correct || letter === q.correct;
            return (
              <li
                key={i}
                className={`px-2 py-0.5 rounded ${isCorrect ? "bg-emerald-50 text-emerald-800 font-semibold" : "text-slate-700"}`}
              >
                {letter}. {opt}{isCorrect ? "  ✓" : ""}
              </li>
            );
          })}
        </ul>
      )}

      {q.type === "short" && (
        <div className="mt-2 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample answer</div>
          <div className="text-slate-700 italic">{q.correct}</div>
        </div>
      )}

      <div className="mt-2 text-xs text-slate-600 border-t border-slate-200 pt-1.5 italic">
        <span className="font-semibold not-italic">Why: </span>
        {q.explanation}
      </div>
    </div>
  );
}

function DiffPill({ d }: { d: "easy" | "medium" | "hard" }) {
  const cls = d === "easy" ? "bg-emerald-100 text-emerald-700"
            : d === "medium" ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-700";
  return <span className={`px-1.5 py-[1px] rounded-full font-medium ${cls}`}>{d}</span>;
}
function BloomPill({ b }: { b: string }) {
  return <span className="px-1.5 py-[1px] rounded-full bg-slate-100 text-slate-700 font-medium">{b}</span>;
}

function countByDifficulty(qs: PQQuestion[]) {
  return qs.reduce(
    (acc, q) => ({ ...acc, [q.difficulty]: (acc as Record<string, number>)[q.difficulty] + 1 }),
    { easy: 0, medium: 0, hard: 0 } as Record<string, number>
  );
}

function Empty() {
  return <div className="text-center py-12 text-sm text-slate-500">No practice questions yet.</div>;
}
