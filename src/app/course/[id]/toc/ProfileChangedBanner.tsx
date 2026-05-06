"use client";

// Banner shown on the TOC when courses.profile_updated_at is more recent
// than any modules.updated_at — i.e. profile changed after the TOC was
// last generated. Per coach feedback: don't auto-rewrite, just signal.

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export function ProfileChangedBanner({
  courseId,
  profileUpdatedAt,
  tocLastGeneratedAt,
}: {
  courseId: string;
  profileUpdatedAt: string;
  tocLastGeneratedAt: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!tocLastGeneratedAt) return null;
  if (new Date(profileUpdatedAt).getTime() <= new Date(tocLastGeneratedAt).getTime()) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-amber-900">
          Course Profile changed after this TOC was generated
        </div>
        <div className="text-[12px] text-amber-800 mt-0.5">
          Audience, outcomes, or pedagogy may no longer match this TOC. Review the lessons and consider
          regenerating to incorporate the new direction.
        </div>
      </div>
      <Link
        href={`/course/${courseId}/profile`}
        className="px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11.5px] font-semibold hover:bg-amber-700 shrink-0"
      >
        Review Profile
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded text-amber-700 hover:bg-amber-100 shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
