"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

export interface ContentVideoRow {
  videoId: string;
  videoTitle: string;
  lessonTitle: string;
  moduleTitle: string;
  contentItems: Array<{
    id: string;
    kind: string;
    status: string;
    payload: Record<string, unknown>;
    generated_at: string | null;
    approved_at: string | null;
    generation_error: string | null;
  }>;
}

const KIND_LABEL: Record<string, string> = {
  pq: "Practice Questions",
  gq: "Graded Questions",
  reading: "Reading",
  scorm: "SCORM",
  ai_coach: "AI Coach",
};

const KIND_ORDER: Record<string, number> = {
  pq: 0,
  gq: 1,
  reading: 2,
  scorm: 3,
  ai_coach: 4,
};

export function ContentView({
  courseId,
  rows,
  kpis,
}: {
  courseId: string;
  rows: ContentVideoRow[];
  kpis: {
    videosWithContent: number;
    approvedCount: number;
    totalCount: number;
  };
}) {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [generatingKind, setGeneratingKind] = useState<Record<string, boolean>>({});
  const [approvingId, setApprovingId] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Group by module → lesson
  const grouped = rows.reduce(
    (acc, row) => {
      if (!acc[row.moduleTitle]) {
        acc[row.moduleTitle] = {};
      }
      if (!acc[row.moduleTitle][row.lessonTitle]) {
        acc[row.moduleTitle][row.lessonTitle] = [];
      }
      acc[row.moduleTitle][row.lessonTitle].push(row);
      return acc;
    },
    {} as Record<string, Record<string, ContentVideoRow[]>>
  );

  const handleGenerateContent = async (
    videoId: string,
    kind: string
  ) => {
    const key = `${videoId}:${kind}`;
    setGeneratingKind((g) => ({ ...g, [key]: true }));
    setErrors((e) => {
      const { [key]: _drop, ...rest } = e;
      return rest;
    });

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          kind,
          course_id: courseId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors((e) => ({
          ...e,
          [key]: data.error || `HTTP ${res.status}`,
        }));
      } else {
        // Refresh page to show new item
        window.location.reload();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrors((er) => ({ ...er, [key]: msg }));
    }

    setGeneratingKind((g) => ({ ...g, [key]: false }));
  };

  const handleApprove = async (itemId: string) => {
    setApprovingId((a) => ({ ...a, [itemId]: true }));
    setErrors((e) => {
      const { [itemId]: _drop, ...rest } = e;
      return rest;
    });

    try {
      const res = await fetch(`/api/content/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors((e) => ({
          ...e,
          [itemId]: data.error || `HTTP ${res.status}`,
        }));
      } else {
        window.location.reload();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrors((er) => ({ ...er, [itemId]: msg }));
    }

    setApprovingId((a) => ({ ...a, [itemId]: false }));
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-bi-navy-900">
            {kpis.videosWithContent}
          </div>
          <div className="text-xs text-bi-navy-600 mt-1">
            Videos with content
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-700">
            {kpis.approvedCount}
          </div>
          <div className="text-xs text-bi-navy-600 mt-1">
            Approved items
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-bi-navy-900">
            {kpis.totalCount}
          </div>
          <div className="text-xs text-bi-navy-600 mt-1">
            Total items
          </div>
        </Card>
      </div>

      {/* Modules → Lessons → Videos */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([moduleName, lessonMap]) => (
          <div key={moduleName} className="space-y-3">
            <h3 className="text-sm font-semibold text-bi-navy-900 px-1">
              {moduleName}
            </h3>
            <div className="space-y-2">
              {Object.entries(lessonMap).map(([lessonName, videoRows]) => (
                <div key={lessonName} className="space-y-2">
                  <h4 className="text-xs font-medium text-bi-navy-700 px-2 py-1">
                    {lessonName}
                  </h4>
                  {videoRows.map((row) => (
                    <Card key={row.videoId} className="p-3">
                      <button
                        onClick={() =>
                          setExpandedVideo(
                            expandedVideo === row.videoId ? null : row.videoId
                          )
                        }
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-bi-navy-900 truncate">
                            {row.videoTitle}
                          </div>
                          <div className="text-xs text-bi-navy-500 mt-0.5">
                            {row.contentItems.length} item
                            {row.contentItems.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        {expandedVideo === row.videoId ? (
                          <ChevronUp className="w-4 h-4 text-bi-navy-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-bi-navy-600 flex-shrink-0" />
                        )}
                      </button>

                      {/* Expanded: per-kind sections */}
                      {expandedVideo === row.videoId && (
                        <div className="mt-4 space-y-4 border-t border-bi-navy-100 pt-4">
                          {Object.entries(KIND_ORDER).map(([kind, _order]) => {
                            const item = row.contentItems.find(
                              (i) => i.kind === kind
                            );
                            const key = `${row.videoId}:${kind}`;
                            const generating = generatingKind[key];
                            const error = errors[key];

                            return (
                              <div key={kind} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-medium text-bi-navy-900">
                                    {KIND_LABEL[kind]}
                                  </h5>
                                  {item?.status === "approved" && (
                                    <Badge variant="success" className="text-xs">
                                      Approved
                                    </Badge>
                                  )}
                                </div>

                                {!item ? (
                                  <Button
                                    onClick={() => handleGenerateContent(row.videoId, kind)}
                                    disabled={generating}
                                    className="w-full text-sm py-1.5"
                                    variant="secondary"
                                  >
                                    {generating ? (
                                      <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      "Generate"
                                    )}
                                  </Button>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="text-xs bg-bi-navy-50 p-2 rounded border border-bi-navy-100 text-bi-navy-700 max-h-24 overflow-y-auto">
                                      <pre className="font-mono whitespace-pre-wrap break-words text-xs">
                                        {JSON.stringify(item.payload, null, 2).substring(0, 300)}...
                                      </pre>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleGenerateContent(row.videoId, kind)}
                                        disabled={generating}
                                        variant="secondary"
                                        className="text-xs py-1 flex-1"
                                      >
                                        {generating ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Re-generating...
                                          </>
                                        ) : (
                                          <>
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            Re-generate
                                          </>
                                        )}
                                      </Button>
                                      {item.status !== "approved" && (
                                        <Button
                                          onClick={() => handleApprove(item.id)}
                                          disabled={approvingId[item.id]}
                                          variant="primary"
                                          className="text-xs py-1 flex-1"
                                        >
                                          {approvingId[item.id] ? (
                                            <>
                                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                              Approving...
                                            </>
                                          ) : (
                                            <>
                                              <Check className="w-3 h-3 mr-1" />
                                              Approve
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {error && (
                                  <div className="text-xs bg-red-50 p-2 rounded border border-red-200 text-red-700 flex items-start gap-2">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                  </div>
                                )}

                                {item?.generation_error && (
                                  <div className="text-xs bg-amber-50 p-2 rounded border border-amber-200 text-amber-700 flex items-start gap-2">
                                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>{item.generation_error}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-bi-navy-300 p-10 text-center text-sm text-bi-navy-500">
          No videos in this course yet.
        </div>
      )}
    </div>
  );
}
