"use client";

// CockpitShell — top-level wrapper for the Content page v3.
// Reads ?view= from the URL and renders the matching view, plus the
// always-visible HealthStrip + 4-tab pivot.

import { useSearchParams } from "next/navigation";
import { HealthStrip } from "./HealthStrip";
import { CockpitView } from "./CockpitView";
import { LessonsView } from "./LessonsView";
import { ArtifactsView } from "./ArtifactsView";
import { StaleView } from "./StaleView";
import { aggregate, type View, type OverviewRow } from "./types";

export function CockpitShell({
  courseId,
  rows,
  daysToDeadline,
}: {
  courseId: string;
  rows: OverviewRow[];
  daysToDeadline: number | null;
}) {
  const sp = useSearchParams();
  const viewParam = sp.get("view") as View | null;
  const view: View =
    viewParam === "lessons" || viewParam === "artifacts" || viewParam === "stale"
      ? viewParam
      : "cockpit";

  const stats = aggregate(rows);

  return (
    <div className="space-y-3">
      <HealthStrip stats={stats} daysToDeadline={daysToDeadline} view={view} />
      <div className="pt-1">
        {view === "cockpit"   && <CockpitView   courseId={courseId} rows={rows} stats={stats} />}
        {view === "lessons"   && <LessonsView   courseId={courseId} rows={rows} />}
        {view === "artifacts" && <ArtifactsView courseId={courseId} rows={rows} />}
        {view === "stale"     && <StaleView     courseId={courseId} rows={rows} />}
      </div>
    </div>
  );
}
