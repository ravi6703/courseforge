// src/lib/activity/index.ts
//
// PROD-2 — Helpers for recording activity_log entries and emitting
// notifications. The schema has had these tables since migration_v2 but
// nothing wrote to them. This module makes that easy from any route.
//
// Usage:
//   await recordActivity(supabase, {
//     orgId: auth.orgId,
//     userId: auth.profileId,
//     userName: auth.email ?? "user",
//     userRole: auth.role,
//     courseId,
//     action: "course.created",
//     targetType: "course",
//     targetId: courseId,
//     details: { title: course.title },
//   });
//
//   await notify(supabase, {
//     userId: assignedCoachProfileId,
//     orgId: auth.orgId,
//     courseId,
//     title: "New course assigned",
//     message: `${auth.email} assigned you to ${course.title}`,
//     type: "action",
//     link: `/course/${courseId}/toc`,
//   });

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityEvent {
  orgId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  courseId: string;
  action: string;          // e.g. "course.created", "toc.improved", "brief.generated"
  targetType?: string;     // e.g. "course", "module", "lesson", "video", "brief"
  targetId?: string;
  details?: Record<string, unknown>;
}

export async function recordActivity(
  supabase: SupabaseClient,
  evt: ActivityEvent
): Promise<void> {
  // Fire-and-forget semantics from the caller's perspective: we await but
  // swallow errors. Activity log failures must not break the main flow.
  try {
    const { error } = await supabase.from("activity_log").insert({
      org_id: evt.orgId,
      course_id: evt.courseId,
      user_id: evt.userId ?? null,
      user_name: evt.userName ?? null,
      user_role: evt.userRole ?? null,
      action: evt.action,
      target_type: evt.targetType ?? null,
      target_id: evt.targetId ?? null,
      details: evt.details ?? {},
    });
    if (error) console.error("[activity] insert failed:", error.message);
  } catch (e) {
    console.error("[activity] unexpected error:", e);
  }
}

export interface NotificationInput {
  userId: string;
  orgId: string;
  courseId?: string;
  title: string;
  message: string;
  type?: "info" | "action" | "warning";
  link?: string;
}

export async function notify(
  supabase: SupabaseClient,
  n: NotificationInput
): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: n.userId,
      org_id: n.orgId,
      course_id: n.courseId ?? null,
      title: n.title,
      message: n.message,
      type: n.type ?? "info",
      link: n.link ?? null,
    });
    if (error) console.error("[notify] insert failed:", error.message);
  } catch (e) {
    console.error("[notify] unexpected error:", e);
  }
}

/**
 * Convenience: record an activity AND notify a list of profile_ids who
 * should hear about it. Useful for "coach commented on TOC, ping the PM"
 * patterns.
 */
export async function recordAndNotify(
  supabase: SupabaseClient,
  evt: ActivityEvent,
  recipients: Array<{ userId: string; title: string; message: string; link?: string }>
): Promise<void> {
  await recordActivity(supabase, evt);
  await Promise.all(
    recipients.map((r) =>
      notify(supabase, {
        userId: r.userId,
        orgId: evt.orgId,
        courseId: evt.courseId,
        title: r.title,
        message: r.message,
        type: "action",
        link: r.link,
      })
    )
  );
}
