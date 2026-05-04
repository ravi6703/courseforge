// Small score + grade pill used on course cards (top-right of the card)
// and elsewhere. Color follows the same A→F scheme as
// /health-score/[id] page.

export function HealthPill({ score }: { score: number }) {
  const grade =
    score >= 90 ? { letter: "A", cls: "bg-emerald-50 text-emerald-700" } :
    score >= 80 ? { letter: "B", cls: "bg-emerald-50 text-emerald-700" } :
    score >= 70 ? { letter: "C", cls: "bg-amber-50 text-amber-700"     } :
    score >= 60 ? { letter: "D", cls: "bg-orange-50 text-orange-700"   } :
                  { letter: "F", cls: "bg-red-50 text-red-700"         };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${grade.cls}`}>
      {score} · {grade.letter}
    </span>
  );
}
