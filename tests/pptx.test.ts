import { describe, it, expect } from "vitest";
import { parsePptx } from "@/lib/pptx/parse";
import JSZip from "jszip";

// Build a minimal in-memory .pptx with two slides + speaker notes for slide 1.
async function makeTinyPptx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  const slide = (n: number, title: string, bullets: string[]) =>
    `<?xml version="1.0"?>
     <p:sld xmlns:p="ns" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
       <a:t>${title}</a:t>
       ${bullets.map((b) => `<a:t>${b}</a:t>`).join("")}
     </p:sld>`;
  zip.file("ppt/slides/slide1.xml", slide(1, "Hello World", ["First bullet", "Second bullet"]));
  zip.file("ppt/slides/slide2.xml", slide(2, "Goodbye", ["Last bullet"]));
  zip.file(
    "ppt/notesSlides/notesSlide1.xml",
    `<p:notes xmlns:p="ns" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Speaker notes for slide 1</a:t></p:notes>`
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("pptx/parse", () => {
  it("extracts title + bullets in slide order", async () => {
    const buf = await makeTinyPptx();
    const slides = await parsePptx(buf);
    expect(slides).toHaveLength(2);
    expect(slides[0].slide_number).toBe(1);
    expect(slides[0].title).toBe("Hello World");
    expect(slides[0].bullets).toEqual(["First bullet", "Second bullet"]);
    expect(slides[1].title).toBe("Goodbye");
    expect(slides[1].bullets).toEqual(["Last bullet"]);
  });

  it("pulls speaker notes when present", async () => {
    const slides = await parsePptx(await makeTinyPptx());
    expect(slides[0].notes).toBe("Speaker notes for slide 1");
    expect(slides[1].notes).toBe(""); // none
  });

  it("decodes XML entities inside text runs", async () => {
    const zip = new JSZip();
    zip.file(
      "ppt/slides/slide1.xml",
      `<p:sld xmlns:a="ns"><a:t>5 &amp; 6 &lt; 10</a:t></p:sld>`
    );
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const slides = await parsePptx(buf);
    expect(slides[0].title).toBe("5 & 6 < 10");
  });
});
