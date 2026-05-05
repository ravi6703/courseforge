"use client";

// Lightweight reading-material editor.
//
// Coaches asked for an in-product way to edit reading material before
// generating downstream content. This is a markdown textarea + preview, with
// "Insert logo" / "Insert heading" / "Insert link" / "Export as HTML" buttons.
// On export, we render a styled HTML page with the company logo at the top so
// the file matches the brand kit set on the course profile.

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bold, Heading2, Link as LinkIcon, Image as ImageIcon, Download, Save, Loader2, Sparkles } from "lucide-react";

interface Props {
  initialMarkdown?: string;
  companyLogoUrl?: string | null;
  courseTitle?: string;
  videoTitle?: string;
  onSave?: (markdown: string) => Promise<void> | void;
}

export function ReadingEditor({
  initialMarkdown = "", companyLogoUrl, courseTitle = "", videoTitle = "", onSave,
}: Props) {
  const [md, setMd] = useState(initialMarkdown);
  const [saving, setSaving] = useState(false);
  const [genImg, setGenImg] = useState(false);
  const wordCount = useMemo(() => md.trim().split(/\s+/).filter(Boolean).length, [md]);

  const generateImage = async () => {
    const desc = window.prompt("Describe the image to generate (e.g. 'flat illustration of a workflow with three nodes connected by arrows'):");
    if (!desc?.trim()) return;
    setGenImg(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: desc.trim(), style: "illustration" }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setMd((prev) => `${prev}${prev.endsWith("\n") || prev === "" ? "" : "\n"}![${desc.trim()}](${data.url})\n`);
      }
    } finally { setGenImg(false); }
  };

  const insertAt = (snippet: string) => {
    setMd((prev) => `${prev}${prev.endsWith("\n") || prev === "" ? "" : "\n"}${snippet}\n`);
  };

  const exportHtml = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(videoTitle || "Reading material")}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #0f172a; }
  header { display:flex; align-items:center; gap:14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
  header img { height: 40px; }
  header .meta { color: #64748b; font-size: 13px; }
  h1, h2, h3 { color: #0b1f4d; }
  a { color: #2b6fed; }
  pre, code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }
  blockquote { border-left: 3px solid #2b6fed; margin: 0; padding-left: 14px; color: #334155; }
</style></head><body>
<header>
  ${companyLogoUrl ? `<img src="${escape(companyLogoUrl)}" alt="logo" />` : ""}
  <div>
    <div style="font-weight:700; font-size:18px;">${escape(courseTitle)}</div>
    <div class="meta">${escape(videoTitle)}</div>
  </div>
</header>
${markdownToHtml(md)}
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(videoTitle || "reading").replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(videoTitle || "reading").replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try { await onSave(md); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-md border border-bi-navy-100 bg-white overflow-hidden">
      <header className="px-3 py-2 border-b border-bi-navy-100 flex items-center gap-1.5 flex-wrap">
        <ToolbarButton onClick={() => insertAt("## Heading")}     icon={Heading2}><span className="hidden sm:inline">Heading</span></ToolbarButton>
        <ToolbarButton onClick={() => insertAt("**bold**")}       icon={Bold}><span className="hidden sm:inline">Bold</span></ToolbarButton>
        <ToolbarButton onClick={() => insertAt("[link](https://)")} icon={LinkIcon}><span className="hidden sm:inline">Link</span></ToolbarButton>
        <ToolbarButton onClick={() => insertAt(`![alt](${companyLogoUrl || "https://"})`)} icon={ImageIcon}><span className="hidden sm:inline">Image</span></ToolbarButton>
        <button
          onClick={generateImage}
          disabled={genImg}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-purple-200 bg-purple-50 text-[11.5px] font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
        >
          {genImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          <span className="hidden sm:inline">Generate</span>
        </button>
        <span className="ml-auto text-[11px] text-bi-navy-500">{wordCount} words</span>
        {onSave && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bi-navy-900 text-white text-[11.5px] font-semibold hover:bg-bi-navy-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
        )}
        <button
          onClick={exportMarkdown}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-bi-navy-200 text-[11.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
        >
          <Download className="w-3 h-3" /> .md
        </button>
        <button
          onClick={exportHtml}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-bi-navy-200 text-[11.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
          title="Export branded HTML"
        >
          <Download className="w-3 h-3" /> .html
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-bi-navy-100">
        <textarea
          value={md}
          onChange={(e) => setMd(e.target.value)}
          rows={16}
          placeholder={`# Module overview\n\nWrite your reading material here.\nUse **markdown**, [links](https://), images, and code blocks freely.`}
          className="p-3 text-[12.5px] font-mono outline-none resize-none w-full"
        />
        <div className="p-3 prose prose-sm max-w-none">
          {md.trim() ? <ReactMarkdown>{md}</ReactMarkdown> : <p className="text-[12px] text-bi-navy-400 italic">Live preview appears here.</p>}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick, icon: Icon, children,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-bi-navy-200 text-[11.5px] font-semibold text-bi-navy-700 hover:bg-bi-navy-50"
    >
      <Icon className="w-3 h-3" />
      {children}
    </button>
  );
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Tiny markdown → HTML for the export. We don't pull in remark/rehype here
// because the editor preview already renders ReactMarkdown for live feedback;
// for the standalone export we keep it simple and predictable.
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inUl = false;
  for (const raw of lines) {
    const line = raw;
    if (/^### /.test(line))      { closeUl(); out.push(`<h3>${escape(line.slice(4))}</h3>`); }
    else if (/^## /.test(line))  { closeUl(); out.push(`<h2>${escape(line.slice(3))}</h2>`); }
    else if (/^# /.test(line))   { closeUl(); out.push(`<h1>${escape(line.slice(2))}</h1>`); }
    else if (/^[-*] /.test(line)){ if (!inUl) { out.push("<ul>"); inUl = true; } out.push(`<li>${inline(line.slice(2))}</li>`); }
    else if (line.trim() === "") { closeUl(); out.push(""); }
    else                         { closeUl(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeUl();
  return out.join("\n");
  function closeUl() { if (inUl) { out.push("</ul>"); inUl = false; } }
  function inline(s: string): string {
    return escape(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }
}
