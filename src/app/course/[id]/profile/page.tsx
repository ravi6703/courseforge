import { ProfileEditor } from "./ProfileEditor";
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
    </div>
  );
}

function ProfilePurposeBanner() {
  return (
    <section className="rounded-lg border border-bi-blue-200 bg-bi-blue-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-bi-blue-600 text-white grid place-items-center font-bold shrink-0">i</div>
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold text-bi-navy-900">What is the Course Profile?</h2>
          <p className="text-[12.5px] text-bi-navy-700 mt-0.5 leading-relaxed">
            The Course Profile is the system context every AI prompt sees. You set it
            once here, and the TOC, briefs, slides, transcripts and content artifacts
            all read from it — so audience, tone, vocabulary, brand, and pedagogy
            stay consistent across the whole course.
          </p>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-bi-navy-700 list-disc pl-5">
            <li><span className="font-semibold">Connected to the TOC:</span> audience + difficulty arc shape modules and lessons.</li>
            <li><span className="font-semibold">Connected to briefs:</span> tone, persona and vocabulary inform every brief.</li>
            <li><span className="font-semibold">Connected to slides &amp; SCORM:</span> brand kit (colors, logo, template) is applied to exports.</li>
            <li><span className="font-semibold">Connected to content:</span> reading list seeds the further-reading artifact.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
