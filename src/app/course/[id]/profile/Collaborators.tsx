"use client";

// Course collaborators panel. Lives on the Course Profile page (each
// course has its own profile + access). Org members see all courses by
// default; this layer adds explicit per-course role grants for users
// outside the org or who need elevated permissions on a specific course.

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Trash2, Copy, Check } from "lucide-react";

interface Collaborator {
  id: string;
  email: string;
  role: "editor" | "reviewer" | "viewer";
  invited_at: string;
  accepted_at: string | null;
  user_id: string | null;
  invite_token: string | null;
}

const ROLE_DESC: Record<Collaborator["role"], string> = {
  editor:   "Edit TOC, briefs, slides, content.",
  reviewer: "Read everything; comment but not edit.",
  viewer:   "Read-only access to the published view.",
};

export function Collaborators({ courseId }: { courseId: string }) {
  const [list, setList] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Collaborator["role"]>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{ url: string; copied: boolean } | null>(null);

  const refresh = () => {
    setLoading(true);
    fetch(`/api/courses/${courseId}/collaborators`)
      .then((r) => r.ok ? r.json() : { collaborators: [] })
      .then((d) => setList(d.collaborators ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, [courseId]);

  const invite = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `HTTP ${res.status}`); return; }
      setLastInvite({ url: data.accept_url, copied: false });
      setEmail("");
      refresh();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const changeRole = async (id: string, next: Collaborator["role"]) => {
    await fetch(`/api/courses/${courseId}/collaborators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: id, role: next }),
    });
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this collaborator from the course?")) return;
    await fetch(`/api/courses/${courseId}/collaborators?collaboratorId=${id}`, { method: "DELETE" });
    refresh();
  };

  const copy = async () => {
    if (!lastInvite) return;
    await navigator.clipboard.writeText(lastInvite.url);
    setLastInvite({ ...lastInvite, copied: true });
    setTimeout(() => setLastInvite((p) => p ? { ...p, copied: false } : null), 2000);
  };

  return (
    <section className="bg-white border border-bi-navy-100 rounded-[10px] shadow-bi-sm overflow-hidden">
      <header className="px-5 py-3.5 border-b border-bi-navy-100">
        <h3 className="text-[15px] font-bold text-bi-navy-900">Course collaborators</h3>
        <p className="text-[12px] text-bi-navy-500 mt-0.5">
          Invite other coaches or reviewers to this specific course. Org members already have access by default.
        </p>
      </header>

      {/* Invite form */}
      <div className="px-5 py-4 border-b border-bi-navy-100">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-3 py-2 border border-bi-navy-200 rounded-md text-[13px]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Collaborator["role"])}
            className="px-3 py-2 border border-bi-navy-200 rounded-md text-[13px] bg-white"
          >
            <option value="editor">Editor</option>
            <option value="reviewer">Reviewer</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={invite}
            disabled={busy || !email.trim()}
            className="px-3.5 py-2 rounded-md bg-bi-blue-100 text-bi-blue-700 border border-bi-blue-200 text-[13px] font-semibold hover:bg-bi-blue-200 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Invite
          </button>
        </div>
        <p className="text-[11px] text-bi-navy-500 mt-1.5">{ROLE_DESC[role]}</p>
        {error && <div className="mt-2 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>}
        {lastInvite && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
            <div className="font-semibold mb-1">Invitation created. Copy this link to send (we&apos;ll auto-email once SMTP is wired):</div>
            <div className="flex items-center gap-2">
              <input value={lastInvite.url} readOnly className="flex-1 px-2 py-1 bg-white border border-emerald-200 rounded text-[11.5px] font-mono" />
              <button
                onClick={copy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-emerald-200 hover:bg-emerald-100 text-[11.5px] font-semibold"
              >
                {lastInvite.copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {lastInvite.copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <ul className="divide-y divide-bi-navy-100">
        {loading && <li className="px-5 py-4 text-[12.5px] text-bi-navy-500">Loading…</li>}
        {!loading && list.length === 0 && (
          <li className="px-5 py-6 text-[12.5px] text-bi-navy-500 italic">No collaborators yet — invite the first one above.</li>
        )}
        {list.map((c) => (
          <li key={c.id} className="px-5 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-bi-navy-900 truncate">{c.email}</div>
              <div className="text-[11px] text-bi-navy-500">
                {c.accepted_at ? `Joined ${new Date(c.accepted_at).toLocaleDateString()}` : "Pending acceptance"}
              </div>
            </div>
            <select
              value={c.role}
              onChange={(e) => changeRole(c.id, e.target.value as Collaborator["role"])}
              className="px-2 py-1 border border-bi-navy-200 rounded text-[12.5px] bg-white"
            >
              <option value="editor">Editor</option>
              <option value="reviewer">Reviewer</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => remove(c.id)}
              className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
