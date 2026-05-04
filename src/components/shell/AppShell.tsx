"use client";

// Shell wrapper for every authenticated page. Renders the BI sidebar,
// the topbar, and pushes main over by 240px (or 64px when collapsed).
// Collapsed state lives in React + localStorage; passed down so Sidebar
// and Topbar both stay in sync without exotic CSS selectors.

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface Crumb { label: string; href?: string }

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  crumbs?: Crumb[];
  rightSlot?: React.ReactNode;
  fullBleed?: boolean;
}

export function AppShell({ children, title, crumbs, rightSlot, fullBleed }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("cf:sidebar:collapsed");
      if (v === "true") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("cf:sidebar:collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} />
      <div
        className={`transition-[margin] duration-200 min-h-screen flex flex-col ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        <Topbar title={title} crumbs={crumbs} rightSlot={rightSlot} onToggleSidebar={toggle} />
        <main className={fullBleed ? "flex-1" : "flex-1 max-w-[1320px] mx-auto w-full px-7 py-7"}>
          {children}
        </main>
      </div>
    </div>
  );
}
