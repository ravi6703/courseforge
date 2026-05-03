// Graded assessment preview — same shape as PQ + per-Q points and rubric.
// Schema: { questions: [PQ + points + rubric_text + graded:true] } 3-5 Qs.

import { QuestionCard } from "./PreviewPQ";

interface GQQuestion {
  id: string;
  type: "mcq" | "short";
  stem: string;
  options?: string[];
  correct: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  bloom: "recall" | "understand" | "apply" | "analyze";
  points: number;
  rubric_text: string;
  graded: true;
}

export function PreviewGQ({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <Empty />;
  const questions = (payload.questions as GQQuestion[] | undefined) ?? [];
  if (questions.length === 0) return <Empty />;

  const totalPoints = questions.reduce((s, q) => s + (q.points ?? 0), 0);
  const offBy100 = totalPoints !== 100;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-bi-navy-700">Graded assessment · {questions.length} questions</h3>
        <div className={`text-xs font-semibold ${offBy100 ? "text-amber-700" : "text-emerald-700"}`}>
          Total weight: {totalPoints} {offBy100 && "(should be 100)"}
        </div>
      </div>

      <div className="space-y-2">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-1.5">
            <QuestionCard q={q} idx={idx + 1} weight={q.points} />
            {q.rubric_text && (
              <div className="ml-3 px-3 py-1.5 text-xs text-bi-navy-700 bg-bi-blue-50/50 border-l-2 border-bi-blue-300 rounded-r">
                <span className="font-semibold uppercase tracking-wide text-bi-navy-500 text-[10px]">Rubric (hidden from learner)</span>
                <div className="mt-0.5">{q.rubric_text}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-center py-12 text-sm text-bi-navy-500">No graded assessment yet.</div>;
}
