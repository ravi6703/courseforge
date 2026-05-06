// Server-rendered summary line for the TOC: counts + running duration totals.

import Link from "next/link";

export function TocSummary({
  courseId,
  moduleCount,
  lessonCount,
  videoCount,
  totalMinutes,
  videoTypeBreakdown,
}: {
  courseId: string;
  moduleCount: number;
  lessonCount: number;
  videoCount: number;
  totalMinutes: number;
  videoTypeBreakdown: Record<string, number>;
}) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const types = Object.entries(videoTypeBreakdown)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-bi-navy-200 bg-bi-navy-50 px-4 py-3 text-sm text-bi-navy-700 flex items-center gap-6 flex-wrap">
      <div><span className="font-semibold">{moduleCount}</span> <span className="text-bi-navy-500">modules</span></div>
      <div><span className="font-semibold">{lessonCount}</span> <span className="text-bi-navy-500">lessons</span></div>
      <div><span className="font-semibold">{videoCount}</span> <span className="text-bi-navy-500">videos</span></div>
      <div title={`${totalMinutes} minutes`}>
        <span className="font-semibold">{hours}h {mins}m</span>{" "}
        <span className="text-bi-navy-500">total runtime</span>
      </div>
      {types.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-bi-navy-500 text-[12px]">Mix:</span>
          {types.map(([t, n]) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-white border border-bi-navy-100 text-[11px] font-semibold text-bi-navy-700">
              {n}× {t.replace("_", " ")}
            </span>
          ))}
        </div>
      )}
      <div className="text-xs text-bi-navy-500 ml-auto flex items-center gap-3">
        <Link href={`/course/${courseId}/profile`} className="text-bi-blue-700 font-semibold hover:underline">
          ← Back to Course Profile
        </Link>
      </div>
    </div>
  );
}
