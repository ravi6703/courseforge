"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { loadState } from "@/lib/store";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const state = loadState();
    setUser(state.currentUser);
  }, []);

  if (!user) return null;

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = () => {
    localStorage.removeItem("courseforge_user");
    localStorage.removeItem("courseforge_data");
    router.push("/");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(user.role === "pm"
      ? [{ label: "Create Course", href: "/create", icon: PlusCircle }]
      : []),
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 ${
        isExpanded ? "w-60" : "w-16"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          CF
        </div>
        {isExpanded && (
          <span className="text-white font-bold text-lg ml-3">CourseForge</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {getInitials(user.name)}
          </div>
          {isExpanded && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                user.role === "pm" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
              }`}>
                {user.role === "pm" ? "PM" : "Coach"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-10 flex items-center justify-center border-t border-slate-800 text-slate-500 hover:text-white transition-colors"
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
}
