"use client";

// Shell wrapper for every authenticated page. Renders the BI sidebar,
// the topbar, and pushes the main content over by 240px (or 64px when
// collapsed). The collapsed state lives on <html data-sidebar-collapsed>
// so CSS in this component can react to it without prop-drilling.

import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface Crumb { label: string; href?: string }

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  crumbs?: Crumb[];
  rightSlot?: React.ReactNode;
  // When true, the page renders without max-width / padding constraints
  // (used for full-bleed canvases like the Content workspace).
  fullBleed?: boolean;
}

export function AppShell({ children, title, crumbs, rightSlot, fullBleed }: AppShellProps) {
  useEffect(() => {
    // Restore collapsed preference from localStorage
    try {
      const v = localStorage.getItem("cf:sidebar:collapsed");
      if (v === "true") {
        const el = document.getElementById("cf-sidebar");
        el?.setAttribute("data-collapsed", "true");
        document.documentElement.setAttribute("data-sidebar-collapsed", "true");
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-bi-navy-50">
      <Sidebar />
      <div className="ml-60 transition-[margin] duration-200 has-[#cf-sidebar[data-collapsed='true']]:ml-16 [html[data-sidebar-collapsed='true']_&]:ml-16 min-h-screen flex flex-col">
        <Topbar title={title} crumbs={crumbs} rightSlot={rightSlot} />
        <main className={fullBleed ? "flex-1" : "flex-1 max-w-[1320px] mx-auto w-full px-7 py-7"}>
          {children}
        </main>
      </div>
    </div>
  );
}
