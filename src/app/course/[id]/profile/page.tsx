import { ProfileEditor } from "./ProfileEditor";
import { Collaborators } from "./Collaborators";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProfile } from "@/lib/course-profile";

export default async function CourseProfilePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const profile = await getProfile(sb, id);
  if (!profile) {
    return <div className="p-10 text-center text-sm text-slate-500">Course profile unavailable.</div>;
  }
  return (
    <div className="space-y-4">
      <ProfilePurposeBanner />
      <ProfileEditor courseId={id} initial={profile} />
      <details className="bg-white border border-bi-navy-100 rounded-lg overflow-hidden">
        <summary className="px-5 py-3 cursor-pointer flex items-center justify-between list-none [&::-webkit-details-marker]:hidden hover:bg-bi-navy-50/60">
          <div>
            <h3 className="text-[14px] font-semibold text-bi-navy-900">Collaborators</h3>
            <p className="text-[11.5px] text-bi-navy-500 mt-0.5">Invite other coaches or reviewers to this course.</p>
          </div>
          <span className="text-[11px] text-bi-navy-500 group-open:hidden">Show</span>
        </summary>
        <div className="border-t border-bi-navy-100">
          <Collaborators courseId={id} />
        </div>
      </details>
    </div>
  );
}

function ProfilePurposeBanner() {
  // Compact one-line note instead of the previous 4-bullet mega-banner
  // — same job (tell first-time visitors what this page is) without
  // dominating the viewport.
  return (
    <p className="text-[12px] text-bi-navy-500 leading-relaxed">
      <span className="font-semibold text-bi-navy-700">Course Profile.</span>{" "}
      The system context every AI prompt sees. Audience, tone, vocabulary, brand and pedagogy
      live here — TOC, briefs, slides, transcripts and content all read from this single source.
    </p>
  );
}
