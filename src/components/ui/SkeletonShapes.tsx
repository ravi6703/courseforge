// BI-aesthetic loading skeletons. Used in place of bare spinners while
// pages hydrate.

export function KpiSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-5 flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2.5">
        <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
        <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
    </div>
  );
}

export function KpiStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {Array.from({ length: count }).map((_, i) => <KpiSkeleton key={i} />)}
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-12 bg-slate-100 rounded-full animate-pulse" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-2.5 w-5/6 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-4 w-14 bg-slate-100 rounded-full animate-pulse" />
        <div className="h-4 w-12 bg-slate-100 rounded-full animate-pulse" />
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" />
      <div className="flex justify-between pt-2 border-t border-slate-100">
        <div className="h-5 w-12 bg-slate-100 rounded-full animate-pulse" />
        <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-5">
      <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 flex-1 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-12 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
