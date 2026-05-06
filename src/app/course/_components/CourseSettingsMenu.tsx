"use client";

// Course-level settings dropdown — replaces the always-visible bottom
// export bar. Coach feedback: "Export buttons are touched once per
// course, not on every visit."
//
// Includes: Open Profile · Export PowerPoint / SCORM / Coursera ·
// Course-wide settings link.

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Settings as SettingsIcon, Download, FileText, FileBox, FileCheck } from "lucide-react";

export function CourseSettingsMenu({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bi-navy-100 text-[13px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
        title="Course settings"
      >
        <SettingsIcon className="w-3.5 h-3.5" />
        Settings
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[260px] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">
            Course
          </div>
          <Link href={`/course/${courseId}/profile`}    className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50">
            <FileText className="w-3.5 h-3.5 text-slate-500" /> Open Profile
          </Link>
          <Link href={`/course/${courseId}/timeline`}   className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50">
            <FileCheck className="w-3.5 h-3.5 text-slate-500" /> Open Timeline (Gantt)
          </Link>
          <div className="px-3 py-2 border-t border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-[.06em] text-slate-500">
            Export
          </div>
          <a href={`/api/export/pptx?courseId=${courseId}`}     target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5 text-slate-500" /> PowerPoint (.pptx)
          </a>
          <a href={`/api/export/scorm?courseId=${courseId}`}    target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50">
            <FileBox className="w-3.5 h-3.5 text-slate-500" /> SCORM 1.2
          </a>
          <a href={`/api/export/coursera?courseId=${courseId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50">
            <FileBox className="w-3.5 h-3.5 text-slate-500" /> Coursera
          </a>
          <div className="px-3 py-2 text-[10px] text-slate-400 italic border-t border-slate-200">
            Udemy &amp; xAPI exports coming soon
          </div>
        </div>
      )}
    </div>
  );
}
