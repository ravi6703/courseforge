// src/app/course/[id]/briefs/page.tsx — placeholder. Refactor model:
//
// 1. Server fetch from videos + content_briefs + coach_inputs
// 2. Client component for the brief tracker + inline edit + AI-improve buttons
// 3. Comments use the generic comments table with target_type='brief'
//
// Kept minimal here so the routing structure is shippable; replicate the TOC
// tab pattern when you implement.

export default async function BriefsTab() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
      Briefs tab — refactor in progress. See TOC tab for the pattern.
    </div>
  );
}
