import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[hsl(222,47%,8%)] border-r border-[hsl(217,33%,17%)] flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-[hsl(217,33%,17%)]">
          <Link href="/dashboard" className="text-xl font-bold text-[hsl(217,91%,60%)]">
            Course<span className="text-[hsl(30,85%,50%)]">Forge</span>
          </Link>
          <p className="text-xs text-[hsl(215,20%,45%)] mt-1">Project Manager</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/dashboard" icon="grid" label="Dashboard" />
          <NavItem href="/courses" icon="book" label="Courses" />
          <NavItem href="/courses/new" icon="plus" label="New Course" />

          <div className="pt-4 mt-4 border-t border-[hsl(217,33%,17%)]">
            <p className="px-3 mb-2 text-xs font-semibold text-[hsl(215,20%,45%)] uppercase tracking-wider">Management</p>
            <NavItem href="/dashboard" icon="users" label="Coaches" />
            <NavItem href="/dashboard" icon="bar" label="Analytics" />
            <NavItem href="/dashboard" icon="file" label="Templates" />
          </div>

          <div className="pt-4 mt-4 border-t border-[hsl(217,33%,17%)]">
            <p className="px-3 mb-2 text-xs font-semibold text-[hsl(215,20%,45%)] uppercase tracking-wider">Content</p>
            <NavItem href="/dashboard" icon="edit" label="Readings" />
            <NavItem href="/dashboard" icon="check" label="Assessments" />
            <NavItem href="/dashboard" icon="zap" label="Plugins" />
          </div>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-[hsl(217,33%,17%)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[hsl(217,91%,60%)] flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(210,40%,98%)] truncate">
                {profile?.full_name || "Project Manager"}
              </p>
              <p className="text-xs text-[hsl(215,20%,45%)] truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  const icons: Record<string, string> = {
    grid: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
    book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    plus: "M12 4v16m8-8H4",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
    bar: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    file: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    check: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    zap: "M13 10V3L4 14h7v7l9-11h-7z",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] transition-all text-sm"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon] || icons.grid} />
      </svg>
      {label}
    </Link>
  );
}
