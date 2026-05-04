// Filter chip — white with chevron, hub.boardinfinity.com Tasks page pattern.

import { ChevronDown } from "lucide-react";
import { ReactNode } from "react";

export function FilterChip({
  active = false, children, onClick,
}: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors border ${
        active
          ? "border-bi-blue-600 bg-bi-blue-50 text-bi-blue-700"
          : "border-bi-navy-100 bg-white text-bi-navy-700 hover:bg-bi-navy-50 hover:border-bi-navy-200"
      }`}
    >
      <span>{children}</span>
      <ChevronDown className="w-3 h-3 text-bi-navy-400" />
    </button>
  );
}
