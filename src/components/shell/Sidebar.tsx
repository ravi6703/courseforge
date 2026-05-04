"use client";

// Light, sectioned sidebar that matches hub.boardinfinity.com.
// - Sections (OVERVIEW / COURSES / COURSE PIPELINE / PUBLIC / ADMIN) are
//   collapsible. State persists in localStorage so a coach's collapse
//   preferences survive navigation.
// - Active item gets solid navy bg + white text (BI's primary highlight).
// - Whole sidebar collapses to icon-only via the topbar hamburger; we
//   read app[data-collapsed=true] off <body>.
// - The "Course pipeline" section only renders when the URL is on a
//   course page so the sidebar isn't cluttered on the dashboard.

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BarChart, BookOpen, Plus,
  Layers, FileText, Presentation, Video, Mic, CheckCircle,
  Heart, Beaker,
  Settings, Users, LogOut, ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number };
type  Section = { id: string; label: string; items: NavItem[]; visibleOn?: (pathname: string) => boolean; pmOnly?: boolean };

const SECTIONS: Section[] = [
  {
    id: "overview", label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Metrics",   href: "/metrics",   icon: BarChart       },
    ],
  },
  {
    id: "courses", label: "Courses",
    items: [
      { label: "All courses", href: "/dashboard", icon: BookOpen },
      { label: "New course",  href: "/create",    icon: Plus    },
    ],
  },
  {
    id: "pipeline", label: "Course pipeline",
    visibleOn: (p) => /^\/course\/[^/]+/.test(p),
    items: [
      { label: "Table of contents", href: "/course/CURRENT/toc",        icon: Layers         },
      { label: "Content briefs",    href: "/course/CURRENT/briefs",     icon: FileText    },
      { label: "Presentations",     href: "/course/CURRENT/ppts",       icon: Presentation     },
      { label: "Recordings",        href: "/course/CURRENT/recording",  icon: Video            },
      { label: "Transcripts",       href: "/course/CURRENT/transcript", icon: Mic              },
      { label: "Content",           href: "/course/CURRENT/content",    icon: BookOpen         },
      { label: "Final review",      href: "/course/CURRENT/review",     icon: CheckCircle     },
    ],
  },
  {
    id: "public", label: "Public",
    items: [
      { label: "Health scores",     href: "/dashboard?tab=health", icon: Heart    },
      { label: "Learning science",  href: "/learning-science",     icon: Beaker  },
    ],
  },
  {
    id: "admin", label: "Admin", pmOnly: true,
    items: [
      { label: "Settings",     href: "/dashboard?settings=1", icon: Settings },
      { label: "Integrations", href: "/dashboard?integrations=1", icon: Settings },
      { label: "Team",         href: "/dashboard?team=1", icon: Users },
    ],
  },
];

const COLLAPSE_KEY = "cf:sidebar:section-collapsed";

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: a } }) => {
      if (!a) return;
      setUser({
        name: a.user_metadata?.name ?? a.email ?? "User",
        email: a.email ?? "",
        role: a.user_metadata?.role ?? "pm",
      });
    });
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      if (raw) setCollapsedSections(JSON.parse(raw));
    } catch {}
  }, []);

  // Resolve "CURRENT" placeholders to the current course id.
  const courseMatch = pathname.match(/^\/course\/([^/]+)/);
  const courseId = courseMatch?.[1] ?? null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === pathname) return true;
    if (href.endsWith("/dashboard") && pathname === "/dashboard") return true;
    return pathname.startsWith(href + "/") || pathname === href;
  };

  if (!user) return <aside className="w-60 bg-white border-r border-slate-200" />;

  const visibleSections = SECTIONS.filter((s) => (!s.visibleOn || s.visibleOn(pathname)) && (!s.pmOnly || user.role === "pm"));

  return (
    <aside
      className={`group/side fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-40 transition-[width] duration-200 overflow-hidden ${collapsed ? "w-16" : "w-60"}`}
      data-collapsed={collapsed ? "true" : "false"}
      id="cf-sidebar"
    >
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-200 shrink-0">
        <div className="w-8 h-8 rounded-full bg-bi-navy-700 text-white grid place-items-center font-black text-sm shrink-0">∞</div>
        <span className={`font-bold text-slate-900 tracking-tight text-[15px] truncate ${collapsed ? "hidden" : ""}`}>
          Course<span className="text-bi-blue-600">Forge</span>
        </span>
      </Link>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleSections.map((sec) => {
          const isCollapsed = !!collapsedSections[sec.id];
          return (
            <div key={sec.id} className="mt-3 first:mt-0">
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className={`flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500 hover:text-slate-700 ${collapsed ? "hidden" : ""}`}
              >
                <span>{sec.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              <ul className={`flex flex-col gap-px ${isCollapsed ? "hidden" : ""}`}>
                {sec.items.map((item) => {
                  const href = courseId ? item.href.replace("CURRENT", courseId) : item.href;
                  const Icon = item.icon;
                  // Skip pipeline links if no course id
                  if (item.href.includes("CURRENT") && !courseId) return null;
                  const active = isActive(href);
                  return (
                    <li key={item.label}>
                      <Link
                        href={href}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                          active
                            ? "bg-bi-navy-900 text-white hover:bg-bi-navy-900"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px] shrink-0" />
                        <span className={`truncate ${collapsed ? "hidden" : ""}`}>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={`ml-auto text-[10px] font-bold tracking-wide rounded-full px-1.5 py-px ${collapsed ? "hidden" : ""} ${
                            active ? "bg-white/20 text-white" : "bg-bi-accent-100 text-bi-accent-700"
                          }`}>{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 px-3 py-2.5 flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bi-navy-700 to-bi-blue-600 text-white grid place-items-center text-[11px] font-bold shrink-0">
          {user.name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase()}
        </div>
        <div className={`min-w-0 flex-1 ${collapsed ? "hidden" : ""}`}>
          <div className="text-[12.5px] font-semibold text-slate-900 truncate leading-tight">{user.name}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-px">{user.role} · BI</div>
        </div>
        <button
          onClick={handleLogout}
          className={`p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md ${collapsed ? "hidden" : ""}`}
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
