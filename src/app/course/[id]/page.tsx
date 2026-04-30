// src/app/course/[id]/page.tsx
//
// Old: 1738-line monolith.
// New: thin redirect to /toc — every tab is its own route.

import { redirect } from "next/navigation";

export default async function CourseIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/course/${id}/toc`);
}
