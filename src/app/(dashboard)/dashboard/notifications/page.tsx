export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

export default async function PMNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get notifications for current user
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Notifications</h1>
        <p className="text-[hsl(215,20%,65%)] text-sm mt-1">Stay updated on your course reviews and approvals.</p>
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2 max-w-2xl">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <div className="bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(217,33%,17%)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[hsl(215,20%,45%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">No notifications yet</h3>
          <p className="text-[hsl(215,20%,65%)] text-sm">You&apos;ll see updates about course reviews and assignments here.</p>
        </div>
      )}
    </div>
  );
}

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  course_id?: string;
}

function NotificationItem({ notification }: { notification: Notification }) {
  const notificationDate = new Date(notification.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "opportunity":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "review_needed":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "approved":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "comment":
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "opportunity":
        return "Opportunity";
      case "review_needed":
        return "Review Needed";
      case "approved":
        return "Approved";
      case "comment":
        return "Comment";
      case "completed":
        return "Completed";
      default:
        return "Notification";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return "M20 7l-8-4m0 0L4 7m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-9-4.5m0 0L4 7m9-4.5v13m9 4.5H3";
      case "review_needed":
        return "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4";
      case "approved":
        return "M5 13l4 4L19 7";
      case "comment":
        return "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";
      case "completed":
        return "M5 13l4 4L19 7";
      default:
        return "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9";
    }
  };

  return (
    <MarkAsReadForm notificationId={notification.id} isRead={notification.is_read}>
      <div
        className={`bg-[hsl(222,47%,8%)] border border-[hsl(217,33%,17%)] rounded-lg p-4 transition-all ${
          !notification.is_read ? "border-[hsl(217,91%,60%)]/50 bg-[hsl(217,91%,60%)]/5" : ""
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
            backgroundColor: notification.type === "opportunity" ? "hsl(217,91%,60%,0.1)" :
                           notification.type === "review_needed" ? "hsl(30,85%,50%,0.1)" :
                           notification.type === "approved" || notification.type === "completed" ? "hsl(152,69%,40%,0.1)" :
                           "hsl(215,20%,45%,0.1)"
          }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={getTypeIcon(notification.type)}
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[hsl(210,40%,98%)]">{notification.title}</h3>
                <span className={`inline-block text-xs font-medium mt-1 px-2 py-0.5 rounded border ${getTypeColor(notification.type)}`}>
                  {getTypeLabel(notification.type)}
                </span>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)] flex-shrink-0 mt-2" />
              )}
            </div>

            <p className="text-sm text-[hsl(215,20%,65%)] mt-2">{notification.body}</p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-2">{notificationDate}</p>
          </div>
        </div>
      </div>
    </MarkAsReadForm>
  );
}

function MarkAsReadForm({ notificationId, isRead, children }: { notificationId: string; isRead: boolean; children: React.ReactNode }) {
  return (
    <form action={async () => {
      "use server";
      const supabase = await createClient();
      if (!isRead) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notificationId);
      }
    }}>
      <button type="submit" className="w-full text-left">
        {children}
      </button>
    </form>
  );
}
