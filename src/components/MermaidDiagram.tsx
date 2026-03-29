"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const renderChart = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
          themeVariables: {
            primaryColor: "#3b82f6",
            primaryTextColor: "#1e293b",
            primaryBorderColor: "#93c5fd",
            lineColor: "#94a3b8",
            secondaryColor: "#f1f5f9",
            tertiaryColor: "#eff6ff",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError("");
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram");
      }
    };

    if (chart) renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600 ${className}`}>
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 flex items-center justify-center ${className}`}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white border border-gray-200 rounded-lg p-4 overflow-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
