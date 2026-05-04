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
}

export function Topbar({
  title,
  crumbs,
  notifCount = 1,
  rightSlot,
  workspace = "Board Infinity",
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

  const toggleSidebar = () => {
    const el = document.getElementById("cf-sidebar");
    if (!el) return;
    const next = el.getAttribute("data-collapsed") !== "true";
    el.setAttribute("data-collapsed", String(next));
    // Also push the page area's left padding via a data attr on <html>
    document.documentElement.setAttribute("data-sidebar-collapsed", String(next));
    try { localStorage.setItem("cf:sidebar:collapsed", String(next)); } catch {}
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-bi-navy-100 flex items-center px-6 gap-3">
      <button
        onClick={toggleSidebar}
        className="p-2 -ml-2 rounded-lg text-bi-navy-600 hover:text-bi-navy-900 hover:bg-bi-navy-50 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {crumbs ? (
        <nav className="flex items-center gap-2 text-[13px] text-bi-navy-500 min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2 min-w-0">
              {i > 0 && <span className="text-bi-navy-300">/</span>}
              {c.href ? (
                <Link href={c.href} className="font-medium hover:text-bi-navy-700 truncate">{c.label}</Link>
              ) : (
                <span className="font-bold text-bi-navy-900 truncate">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : (
        <h1 className="text-[18px] font-bold text-bi-navy-900 tracking-tight">{title ?? "CourseForge"}</h1>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        {rightSlot}

        <button className="inline-flex items-center gap-2 border border-bi-navy-100 bg-white text-bi-navy-700 px-3 py-1.5 rounded-lg text-[13px] font-medium hover:bg-bi-navy-50 transition-colors">
          <Briefcase className="w-3.5 h-3.5 text-bi-navy-500" />
          <span>{workspace}</span>
          <ChevronDown className="w-3 h-3 text-bi-navy-400" />
        </button>

        <button
          className="relative w-9 h-9 rounded-lg bg-bi-navy-50 text-bi-navy-600 hover:bg-bi-navy-100 hover:text-bi-navy-900 grid place-items-center transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 border-2 border-white rounded-full" />
          )}
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bi-navy-700 to-bi-blue-600 text-white grid place-items-center text-[12px] font-bold cursor-pointer">
          {initials}
        </div>
      </div>
    </header>
  );
}
