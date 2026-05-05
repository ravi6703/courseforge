"use client";

// Thin wrapper around VideoWorkspace that owns the activeKind URL state
// (?k=…) so the new per-video page integrates cleanly with the workspace
// without duplicating its tab logic.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { VideoWorkspace } from "../VideoWorkspace";
import { CONTENT_KINDS, type ContentKindKey, type ContentVideoRow } from "../types";

export function VideoWorkspaceClient({
  courseId, row,
}: {
  courseId: string;
  row: ContentVideoRow;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeKindRaw = searchParams.get("k") as ContentKindKey | null;
  const activeKind: ContentKindKey =
    activeKindRaw && (CONTENT_KINDS as readonly string[]).includes(activeKindRaw)
      ? (activeKindRaw as ContentKindKey)
      : "reading";

  const setKind = (kind: ContentKindKey) => {
    // Push a real navigation to the per-artifact page when the coach
    // wants to focus on one kind ("Open as full editor"); for in-place
    // tab switching we just shallow-replace the ?k=… param.
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("k", kind);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    void courseId;
  };

  return <VideoWorkspace row={row} activeKind={activeKind} onKindChange={setKind} />;
}
