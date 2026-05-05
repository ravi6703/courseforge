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
  return <ProfileEditor courseId={id} initial={profile} />;
}
