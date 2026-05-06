"use client";

// Presence bar — tiny header row showing who else is currently viewing
// this course. Backed by Supabase Realtime presence channels.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Eye } from "lucide-react";

interface PresenceUser {
  user_id: string;
  name: string;
  avatar?: string;
  joined_at: number;
}

export function PresenceBar({ courseId }: { courseId: string }) {
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const sb = createClient();
    let mounted = true;

    sb.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) return;
      const me: PresenceUser = {
        user_id: data.user.id,
        name: (data.user.user_metadata?.name as string) ?? data.user.email ?? "User",
        joined_at: Date.now(),
      };

      const channel = sb.channel(`course-presence:${courseId}`, { config: { presence: { key: me.user_id } } });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState() as Record<string, PresenceUser[]>;
          const everyone = Object.values(state).flat();
          if (mounted) setOthers(everyone.filter((p) => p.user_id !== me.user_id));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track(me);
          }
        });

      return () => { sb.removeChannel(channel); };
    });

    return () => { mounted = false; };
  }, [courseId]);

  if (others.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10.5px] font-semibold text-emerald-800">
      <Eye className="w-3 h-3" />
      <span>{others.length} other{others.length > 1 ? "s" : ""} here</span>
      <span className="flex -space-x-1">
        {others.slice(0, 4).map((u) => (
          <span
            key={u.user_id}
            className="w-4 h-4 rounded-full bg-bi-blue-200 text-bi-blue-900 grid place-items-center text-[8px] font-bold ring-1 ring-white"
            title={u.name}
          >
            {u.name?.[0]?.toUpperCase() ?? "?"}
          </span>
        ))}
      </span>
    </div>
  );
}
