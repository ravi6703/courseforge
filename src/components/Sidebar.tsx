"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  ListTree,
  Video,
  FileText,
  CheckSquare,
  Bell,
  ScrollText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { loadState } from "@/lib/store";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const state = loadState();
  const user = state.currentUser;

  if (!user) return null;

  const isActive = (href: string) => pathname === href;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get notification count (mocked for now)
  const notificationCount = 3;

  // Navigation sections
  const mainNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      label: "Create Course",
      href: "/create",
      icon: PlusCircle,
      pmOnly: true,
    },
  ];

  const coursesNavItems = [
    { label: "All Courses", href: "/courses", icon: BookOpen },
    { label: "TOC Builder", href: "/toc-builder", icon: ListTree },
    { label: "Video Studio", href: "/video-studio", icon: Video },
    { label: "Content Studio", href: "/content-studio", icon: FileText },
    {
      label: "Review Queue",
      href: "/review",
      icon: CheckSquare,
      pmOnly: true,
    },
  ];

  const activityNavItems = [
    { label: "Notifications", href: "/notifications", icon: Bell, badge: notificationCount },
    { label: "Activity Log", href: "/activity", icon: ScrollText, pmOnly: true },
  ];

  const filterByRole = (items: typeof mainNavItems) =>
    items.filter((item) => !item.pmOnly || user.role === "pm");

  const NavItem = ({
    item,
  }: {
    item: (typeof mainNavItems | typeof activityNavItems)[number];
  }) => {
    const Icon = item.icon as React.ComponentType<React.SVGProps<SVGSVGElement>>;
    const active = isActive(item.href);

    return (
      <Link href={item.href}>
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            active
              ? "bg-white/20 text-white"
              : "text-blue-100 hover:bg-white/10"
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
          {isExpanded && "badge" in item && (item as typeof activityNavItems[number]).badge && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {(item as typeof activityNavItems[number]).badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const NavSection = ({
    title,
    items,
  }: {
    title: string;
    items: typeof mainNavItems;
  }) => {
    const visibleItems = filterByRole(items);
    if (visibleItems.length === 0) return null;

    return (
      <div>
        {isExpanded && (
          <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider px-3 py-2 mt-4 first:mt-0">
            {title}
          </h3>
        )}
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-blue-900 to-blue-950 border-r border-blue-800 flex flex-col transition-all duration-300 z-40 ${
        isExpanded ? "w-60" : "w-16"
      }`}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-blue-800">
        {isExpanded && (
          <span className="text-white font-bold text-lg">CourseForge</span>
        )}
        {!isExpanded && (
          <span className="text-white font-bold text-lg">CF</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        <NavSection title="Main" items={mainNavItems} />
        <NavSection title="Courses" items={coursesNavItems} />
        <NavSection title="Activity" items={activityNavItems} />
      </nav>

      {/* User Info Section */}
      <div className="border-t border-blue-800 p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ${
              isExpanded ? "w-10 h-10" : "w-8 h-8"
            }`}
          >
            {getInitials(user.name)}
          </div>
          {isExpanded && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    user.role === "pm"
                      ? "bg-blue-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {user.role === "pm" ? "PM" : "Coach"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse/Expand Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-12 flex items-center justify-center border-t border-blue-800 text-blue-300 hover:text-white hover:bg-blue-800/50 transition-colors"
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isExpanded ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
