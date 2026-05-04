"use client";

// Topbar matching hub.boardinfinity.com — page title or breadcrumbs on
// the left, workspace pill + notification bell + user avatar on the right.
// The hamburger toggles the sidebar's collapsed state via a class on
// <html data-sidebar-collapsed="true">, read by Sidebar.tsx.

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Bell, ChevronDown, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Crumb { label: string; href?: string }
interface TopbarProps {
  title?: string;          // shown when no crumbs
  crumbs?: Crumb[];        // overrides title
  notifCount?: number;     // shows red dot if > 0
  rightSlot?: React.ReactNode;
  workspace?: string;      // "Board Infinity" by default
  onToggleSidebar?: () => void;
}

export function Topbar({
  title,
  crumbs,
  notifCount = 1,
  rightSlot,
  workspace = "Board Infinity",
  onToggleSidebar,
}: TopbarProps) {
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.name ?? user.email ?? "U";
      setInitials(name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase());
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onToggleSidebar?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleSidebar]);



  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-3">
      <button
        onClick={onToggleSidebar}
        className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        aria-label="Toggle sidebar"
        title="Collapse sidebar (⌘B)"
      >
        <Menu className="w-5 h-5" />
      </button>

      {crumbs ? (
        <nav className="flex items-center gap-2 text-[13px] text-slate-500 min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 min-w-0">
              {i > 0 && <span className="text-slate-300">/</span>}
              {c.href ? (
                <Link href={c.href} className="font-medium hover:text-slate-700 truncate">{c.label}</Link>
              ) : (
                <span className="font-bold text-slate-900 truncate">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : (
        <h1 className="text-[18px] font-bold text-slate-900 tracking-tight">{title ?? "CourseForge"}</h1>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        {rightSlot}

        <div className="inline-flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-3 py-1.5 rounded-lg text-[13px] font-medium">
          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
          <span>{workspace}</span>
        </div>

        <button
          className="relative w-9 h-9 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 grid place-items-center transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 border-2 border-white rounded-full" aria-label={`${notifCount} unread notifications`} />
          )}
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bi-navy-700 to-bi-blue-600 text-white grid place-items-center text-[12px] font-bold cursor-pointer">
          {initials}
        </div>
      </div>
    </header>
  );
}
