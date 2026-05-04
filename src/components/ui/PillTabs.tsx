// Segmented pill tabs (My Tasks | Team Tasks | Major Tasks pattern).
// Active pill is solid navy; bg is the BI hub light navy.

import { LucideIcon } from "lucide-react";

interface Tab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

export function PillTabs<T extends string>({
  tabs, active, onChange,
}: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex bg-slate-100 rounded-[9px] p-[3px] gap-px">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isSel = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-semibold transition-all flex items-center gap-1.5 ${
              isSel
                ? "bg-bi-navy-900 text-white shadow-[0_1px_2px_rgba(11,31,77,.15)]"
                : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
