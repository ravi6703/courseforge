"use client";

import { getStatusBadgeVariant, ContentStatus } from "@/lib/content-types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ContentStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const variant = getStatusBadgeVariant(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        variant.bgColor,
        variant.textColor,
        className
      )}
    >
      {showIcon && variant.icon && (
        <span className="text-xs">{variant.icon}</span>
      )}
      {variant.label}
    </span>
  );
}
