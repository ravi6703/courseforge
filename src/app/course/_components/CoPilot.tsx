"use client";

// Course-scoped AI co-pilot — floating chat widget on every course page.
// Scoped to the current course (POSTs course id with each message), so
// the model knows the profile + context.

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, X, MessageSquare } from "lucide-react";

interface Msg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

export function CoPilot({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/copilot?course=${courseId}`)
      .then((r) => r.json())
      .then((j) => setMessages(j.messages ?? []));
  }, [open, courseId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    const content = input.trim();
    if (!content) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: courseId, content }),
      });
      const j = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: j.reply ?? "(no reply)" }]);
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-bi-blue-600 text-white text-[12.5px] font-bold shadow-lg hover:bg-bi-blue-700"
      >
        <Sparkles className="w-4 h-4" /> Co-pilot
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[380px] h-[520px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <header className="px-3 py-2.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
        <Sparkles className="w-3.5 h-3.5 text-bi-blue-600" />
        <span className="text-[12.5px] font-bold text-slate-900">Co-pilot</span>
        <span className="text-[10.5px] text-slate-500">— knows this course</span>
        <button onClick={() => setOpen(false)} className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-200">
          <X className="w-3.5 h-3.5" />
        </button>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-[12px] text-slate-500 italic flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Ask anything about this course — e.g. &quot;rewrite Module 2 for beginners&quot;.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[12.5px] leading-relaxed rounded-lg px-3 py-2 max-w-[88%] ${
              m.role === "user"
                ? "ml-auto bg-bi-blue-600 text-white"
                : "bg-slate-50 text-slate-800 border border-slate-100"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="text-[11.5px] text-slate-500 inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Thinking…</div>}
      </div>
      <footer className="border-t border-slate-200 p-2.5 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          rows={1}
          placeholder="Ask the co-pilot…"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-[12.5px] outline-none focus:border-bi-blue-400 focus:ring-2 focus:ring-bi-blue-100 resize-none"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-bi-blue-600 text-white hover:bg-bi-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </footer>
    </div>
  );
}
