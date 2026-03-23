export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PortalLayout({
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

  // Check if user has coach role
  if (profile?.role !== "coach") {
    redirect("/dashboard");
  }

  // Get unread notifications count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[hsl(222,47%,8%)] border-r border-[hsl(217,33%,17%)] flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-[hsl(217,33%,17%)]">
          <Link href="/portal" className="text-xl font-bold text-[hsl(217,91%,60%)]">
            Course<span className="text-[hsl(30,85%,50%)]">Forge</span>
          </Link>
          <p className="text-xs text-[hsl(215,20%,45%)] mt-1">Coach Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/portal" icon="grid" label="Dashboard" />
          <NavItem href="/portal/opportunities" icon="briefcase" label="Opportunities" />
          <NavItem href="/portal/courses" icon="book" label="My Courses" />
          <NavItem
            href="/portal/notifications"
            icon="bell"
            label="Notifications"
            badge={unreadCount || 0}
          />
        </nav>

        {/* User */}
        <div className="p-4 border-t border-[hsl(217,33%,17%)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[hsl(217,91%,60%)] flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(210,40%,98%)] truncate">
                {profile?.full_name || "Coach"}
              </p>
              <p className="text-xs text-[hsl(215,20%,45%)] truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(215,20%,65%)] bg-[hsl(217,33%,17%)] px-2 py-1 rounded">
              Coach
            </span>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-4 border-t border-[hsl(217,33%,17%)]">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}) {
  const icons: Record<string, string> = {
    grid: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
    book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    briefcase: "M20 7l-8-4m0 0L4 7m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-9-4.5m0 0L4 7m9-4.5v13m9 4.5H3",
    bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] transition-all text-sm relative group"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon] || icons.grid} />
      </svg>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 && (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-[hsl(217,91%,60%)]">
          {badge}
        </span>
      )}
    </Link>
  );
}

function SignOutButton() {
  return (
    <form action={async () => {
      "use server";
      const supabase = await createClient();
      await supabase.auth.signOut();
      redirect("/login");
    }}>
      <button
        type="submit"
        className="w-full px-3 py-2 rounded-lg text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] transition-all text-sm font-medium flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign Out
      </button>
    </form>
  );
}
