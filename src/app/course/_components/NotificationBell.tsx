"use client";

// In-app notification dropdown for slip detection, asset-ready signals,
// profile-changed banners, etc. Reads from /api/course/[id]/notifications.

import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, CheckCircle2, Sparkles, Clock } from "lucide-react";

interface Notif {
  id: string;
  kind: "step_slipping" | "step_blocked" | "asset_ready" | "deadline_at_risk" | "transcript_ready" | "profile_changed";
  severity: "info" | "warn" | "danger";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const ICON: Record<Notif["kind"], React.ComponentType<{ className?: string }>> = {
  step_slipping: AlertTriangle,
  step_blocked: AlertTriangle,
  asset_ready: Sparkles,
  deadline_at_risk: Clock,
  transcript_ready: CheckCircle2,
  profile_changed: Sparkles,
};

export function NotificationBell({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/course/${courseId}/notifications`);
      if (r.ok) {
        const j = await r.json();
        setItems(j.items || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);
  useEffect(() => {
    const id = setInterval(load, 60000); // poll every minute
    return () => clearInterval(id);
  }, [courseId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = async () => {
    await fetch(`/api/course/${courseId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center gap-1.5 p-2 rounded-lg border border-bi-navy-100 text-bi-navy-700 hover:bg-bi-navy-50"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[360px] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-900">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-bi-blue-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-slate-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-slate-500">
                You&apos;re all caught up. 🎉
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                const tone =
                  n.severity === "danger" ? "text-rose-600 bg-rose-50" :
                  n.severity === "warn"   ? "text-amber-600 bg-amber-50" :
                                            "text-bi-blue-600 bg-bi-blue-50";
                return (
                  <a
                    key={n.id}
                    href={n.link || "#"}
                    className={`block px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                      !n.read_at ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`p-1.5 rounded-md ${tone} shrink-0`}>
                        <Icon className="w-3 h-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold text-slate-900">{n.title}</div>
                        {n.body && <div className="text-[11.5px] text-slate-600 mt-0.5">{n.body}</div>}
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
