"use client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden md:block w-64 bg-white border-r border-gray-200 fixed h-screen left-0 top-0 z-40" />
      <main className="flex-1 md:ml-64 overflow-auto">{children}</main>
    </div>
  );
}
