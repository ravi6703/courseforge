"use client";

// Final Review — tabbed surface so the 5 sections stop competing for
// vertical attention. Defaults to "Audit" since that's the section the
// coach acts on most.

import { useState } from "react";
import { ShieldCheck, ShieldAlert, FileBarChart, Share2, Send } from "lucide-react";

const TABS = [
  { id: "audit",    label: "Audit",          icon: FileBarChart },
  { id: "a11y",     label: "Accessibility",  icon: ShieldAlert },
  { id: "health",   label: "Health score",   icon: ShieldCheck },
  { id: "share",    label: "Share",          icon: Share2 },
  { id: "publish",  label: "Publish",        icon: Send },
] as const;

type TabId = typeof TABS[number]["id"];

export function ReviewTabs({
  audit, a11y, health, share, publish,
}: {
  audit:   React.ReactNode;
  a11y:    React.ReactNode;
  health:  React.ReactNode;
  share:   React.ReactNode;
  publish: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("audit");
  return (
    <div className="space-y-3">
      <nav className="bg-white border border-bi-navy-100 rounded-lg p-1 inline-flex gap-1 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors ${
                active
                  ? "bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200"
                  : "text-bi-navy-600 hover:text-bi-navy-900 hover:bg-bi-navy-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div>
        {tab === "audit"   && audit}
        {tab === "a11y"    && a11y}
        {tab === "health"  && health}
        {tab === "share"   && share}
        {tab === "publish" && publish}
      </div>
    </div>
  );
}
