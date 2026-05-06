"use client";

// Wraps the CourseTree in a collapsible left rail.
//
// Coach feedback: persistent left tree on every page eats space and
// fights the page content for attention. Solution: keep the tree (it's
// useful for navigation) but make it collapse to a slim 44px gutter
// with a single chevron. Width preference persists in localStorage.

import { ReactNode, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";

const KEY = "cf:rail:collapsed";

export function CollapsibleRail({ children, courseId }: { children: ReactNode; courseId: string }) {
  // SSR-safe: render expanded server-side, hydrate from localStorage on mount.
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "1") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  if (!hydrated) {
    // Initial paint matches expanded layout to avoid flash.
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
          title="Expand course tree"
          aria-label="Expand course tree"
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
          title="Collapse course tree"
          aria-label="Collapse course tree"
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
