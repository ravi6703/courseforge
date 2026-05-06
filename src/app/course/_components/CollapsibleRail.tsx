"use client";

// Wraps the CourseTree in a collapsible left rail.
//
// 2026-05 declutter v2: the rail is genuinely useful only on drill-down
// pages (slide editor, lesson workspace, single transcript) where it
// serves as navigation. On overview pages (TOC, Briefs, PPT Tracker,
// Recording, Transcript overview, Content, Metrics) the page IS already
// a list of lessons/videos, so the rail is duplicate furniture.
//
// We detect this from the pathname and set a smart default: collapsed
// on overview pages, expanded on drill-down pages. The user can still
// override via the toggle and the choice persists in localStorage.

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";

const KEY = "cf:rail:collapsed";

// Pages where the rail is duplicate of page content → collapse by default.
const OVERVIEW_PATTERNS = [
  /^\/course\/[^/]+\/?$/,
  /^\/course\/[^/]+\/profile/,
  /^\/course\/[^/]+\/toc/,
  /^\/course\/[^/]+\/briefs\/?$/,
  /^\/course\/[^/]+\/ppts\/?$/,
  /^\/course\/[^/]+\/recording/,
  /^\/course\/[^/]+\/transcript\/?$/,
  /^\/course\/[^/]+\/content\/?$/,
  /^\/course\/[^/]+\/timeline/,
  /^\/course\/[^/]+\/review/,
];

function isOverviewPath(pathname: string): boolean {
  return OVERVIEW_PATTERNS.some((re) => re.test(pathname));
}

export function CollapsibleRail({ children, courseId }: { children: ReactNode; courseId: string }) {
  const pathname = usePathname() ?? "";
  const overview = isOverviewPath(pathname);

  // SSR-safe: render based on pathname-default, hydrate from localStorage on mount.
  const [collapsed, setCollapsed] = useState(overview);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === "1") setCollapsed(true);
      else if (stored === "0") setCollapsed(false);
      // else: keep the pathname default
      else setCollapsed(overview);
    } catch {
      setCollapsed(overview);
    }
    setHydrated(true);
  }, [overview]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  if (!hydrated) {
    // Initial paint matches the pathname default to avoid flash.
    if (overview) {
      return (
        <div className="lg:sticky lg:top-[120px] lg:self-start lg:w-[44px]">
          <div className="w-11 h-32 bg-white border border-slate-200 rounded-[10px]" />
        </div>
      );
    }
    return (
      <div className="lg:sticky lg:top-[120px] lg:self-start lg:w-[300px]" style={{ maxHeight: "calc(100vh - 140px)" }}>
        {children}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="lg:sticky lg:top-[120px] lg:self-start lg:w-[44px]">
        <button
          onClick={toggle}
          className="w-11 h-32 bg-white border border-slate-200 rounded-[10px] flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:border-bi-blue-300 transition-colors"
          title="Show course tree"
          aria-label="Show course tree"
          data-courseid={courseId}
        >
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 [writing-mode:vertical-rl]">
            Tree
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-[120px] lg:self-start lg:w-[300px]" style={{ maxHeight: "calc(100vh - 140px)" }}>
      <div className="relative">
        <button
          onClick={toggle}
          className="absolute -right-3 top-3 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-bi-blue-300 transition-colors"
          title="Hide course tree"
          aria-label="Hide course tree"
        >
          <ChevronLeft className="w-3 h-3 text-slate-500" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Hook for child pages to know whether the rail is collapsed (e.g., to
// expand to a wider layout). Reads localStorage; keeps in sync via storage event.
export function useRailCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch {}
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setCollapsed(e.newValue === "1");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return collapsed;
}
