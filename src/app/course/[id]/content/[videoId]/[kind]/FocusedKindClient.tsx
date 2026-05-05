"use client";

// Focused single-kind editor — uses VideoWorkspace but locks the rail
// to the URL-specified kind. Coach can't accidentally tab away to a
// different artifact while editing in this view.

import { VideoWorkspace } from "../../VideoWorkspace";
import type { ContentKindKey, ContentVideoRow } from "../../types";

export function FocusedKindClient({
  courseId, row, kind,
}: {
  courseId: string;
  row: ContentVideoRow;
  kind: ContentKindKey;
}) {
  void courseId;
  return <VideoWorkspace row={row} activeKind={kind} onKindChange={() => { /* locked in focused view */ }} />;
}
