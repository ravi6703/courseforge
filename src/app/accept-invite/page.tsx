"use client";

// /accept-invite?token=… — turns a copy-pasted invite link into an
// accepted collaboration row, then redirects to the course.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Next 14 requires components calling useSearchParams to be inside a
// Suspense boundary; wrap the inner client component in one so the
// build doesn't fail on prerender.
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-bi-navy-500" />
      </div>
    }>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"checking" | "ready" | "accepting" | "done" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<{ course_id: string; role: string } | null>(null);

  useEffect(() => {
    if (!token) { setState("error"); setError("Missing invite token."); return; }
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push(`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
        return;
      }
      setState("ready");
    });
  }, [token, router]);

  const accept = async () => {
    setState("accepting");
    setError(null);
    try {
      const res = await fetch("/api/collaborators/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); setError(data.error ?? `HTTP ${res.status}`); return; }
      setCourse({ course_id: data.course_id, role: data.role });
      setState("done");
      setTimeout(() => router.push(`/course/${data.course_id}/toc`), 1200);
    } catch (e) {
      setState("error");
      setError((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-bi-navy-50 grid place-items-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-bi-navy-100 shadow-bi-md p-8">
        <h1 className="text-[20px] font-bold text-bi-navy-900">Accept course invitation</h1>
        <p className="text-[13px] text-bi-navy-500 mt-1">
          You&apos;ve been invited to collaborate on a course.
        </p>

        <div className="mt-6">
          {state === "checking" && (
            <div className="text-[13px] text-bi-navy-500 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
            </div>
          )}
          {state === "ready" && (
            <button
              onClick={accept}
              className="px-4 py-2 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200"
            >
              Accept invitation
            </button>
          )}
          {state === "accepting" && (
            <div className="text-[13px] text-bi-navy-500 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Accepting…
            </div>
          )}
          {state === "done" && course && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800 inline-flex items-center gap-2">
              <Check className="w-4 h-4" /> Accepted as <strong>{course.role}</strong>. Redirecting…
            </div>
          )}
          {state === "error" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800 inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
