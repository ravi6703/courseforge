// Final review tab — tabbed (audit | a11y | health | share | publish)
// instead of five stacked panels.

import { CourseHealthPanel } from "@/components/CourseHealthPanel";
import { ShareHealthScoreToggle } from "@/components/ShareHealthScoreToggle";
import { AuditFindings } from "./AuditFindings";
import { WcagFindings } from "./WcagFindings";
import { CourseraPublish } from "./CourseraPublish";
import { ReviewTabs } from "./ReviewTabs";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function ReviewTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: courseRow } = await supabase
    .from("courses")
    .select("public_health_score")
    .eq("id", id)
    .maybeSingle();

  return (
    <ReviewTabs
      audit={<AuditFindings courseId={id} />}
      a11y={<WcagFindings courseId={id} />}
      health={<CourseHealthPanel courseId={id} />}
      share={<ShareHealthScoreToggle courseId={id} initialPublic={Boolean(courseRow?.public_health_score)} />}
      publish={<CourseraPublish courseId={id} />}
    />
  );
}
