// src/lib/exporters/coursera.ts — Coursera Course Builder export pack.
//
// Coursera's Course Builder accepts an "import package": one folder per video
// with a .pptx, transcript .vtt, and a metadata.json. This exporter shapes
// CourseForge data into that layout and zips it.
//
// Schema reference (publicly documented import format used by partners):
//   https://www.coursera.org/about/teach (Course Builder docs gated; the
//   shape below mirrors what Board Infinity's existing Coursera deals use)
//
// Output zip structure:
//   course.json
//   readme.txt
//   modules/
//     m1-foundations/
//       module.json
//       l1-what-is-genai/
//         lesson.json
//         videos/
//           v1-rise-of-ai/
//             slides.pptx
//             transcript.vtt
//             metadata.json
//             readings/
//               r1.md
//             quizzes/
//               q1.json

import JSZip from "jszip";
import { renderSlidesToPptx, SlideJSON, CourseMetaForExport } from "./pptx";

export type CourseraCourse = {
  id: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  org_name?: string | null;
  brand_color_hex?: string | null;
  modules: CourseraModule[];
};

export type CourseraModule = {
  id: string;
  title: string;
  description?: string | null;
  duration_hours?: number;
  order: number;
  lessons: CourseraLesson[];
};

export type CourseraLesson = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  videos: CourseraVideo[];
  readings: Array<{ title: string; content_md: string }>;
  quizzes: Array<{
    title: string;
    passing_score: number;
    questions: Array<{
      prompt: string;
      options: string[];
      correct_index: number;
      explanation?: string;
    }>;
  }>;
};

export type CourseraVideo = {
  id: string;
  title: string;
  duration_minutes: number;
  order: number;
  slides: SlideJSON[];
  transcript_segments: Array<{ start: number; end: number; text: string }>;
};

export async function buildCourseraPack(course: CourseraCourse): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file("course.json", JSON.stringify(courseManifest(course), null, 2));
  zip.file("readme.txt", README);

  const courseMeta: CourseMetaForExport = {
    title: course.title,
    description: course.description,
    org_name: course.org_name,
    brand_color_hex: course.brand_color_hex,
  };

  for (const m of course.modules) {
    const mDir = `modules/${slug(m.title, m.order)}`;
    zip.file(`${mDir}/module.json`, JSON.stringify(moduleManifest(m), null, 2));

    for (const l of m.lessons) {
      const lDir = `${mDir}/${slug(l.title, l.order)}`;
      zip.file(`${lDir}/lesson.json`, JSON.stringify(lessonManifest(l), null, 2));

      for (const v of l.videos) {
        const vDir = `${lDir}/videos/${slug(v.title, v.order)}`;
        if (v.slides && v.slides.length > 0) {
          const pptxBytes = await renderSlidesToPptx(courseMeta, v.title, v.slides);
          zip.file(`${vDir}/slides.pptx`, pptxBytes);
        }
        zip.file(`${vDir}/transcript.vtt`, toVtt(v.transcript_segments));
        zip.file(
          `${vDir}/metadata.json`,
          JSON.stringify(
            {
              id: v.id,
              title: v.title,
              order: v.order,
              duration_minutes: v.duration_minutes,
              slide_count: v.slides?.length ?? 0,
            },
            null,
            2
          )
        );
      }

      l.readings.forEach((r, i) =>
        zip.file(`${lDir}/readings/r${i + 1}.md`, `# ${r.title}\n\n${r.content_md}`)
      );

      l.quizzes.forEach((q, i) =>
        zip.file(
          `${lDir}/quizzes/q${i + 1}.json`,
          JSON.stringify(
            {
              title: q.title,
              passing_score: q.passing_score,
              questions: q.questions.map((qq) => ({
                prompt: qq.prompt,
                options: qq.options,
                correct_index: qq.correct_index,
                explanation: qq.explanation || "",
              })),
            },
            null,
            2
          )
        )
      );
    }
  }

  return await zip.generateAsync({ type: "uint8array" });
}

function courseManifest(c: CourseraCourse) {
  return {
    schema: "courseforge.coursera-import.v1",
    id: c.id,
    title: c.title,
    description: c.description ?? "",
    domain: c.domain ?? "",
    modules: c.modules.length,
    generated_at: new Date().toISOString(),
  };
}

function moduleManifest(m: CourseraModule) {
  return {
    id: m.id,
    title: m.title,
    description: m.description ?? "",
    duration_hours: m.duration_hours ?? 0,
    order: m.order,
    lessons: m.lessons.length,
  };
}

function lessonManifest(l: CourseraLesson) {
  return {
    id: l.id,
    title: l.title,
    description: l.description ?? "",
    order: l.order,
    videos: l.videos.length,
    readings: l.readings.length,
    quizzes: l.quizzes.length,
  };
}

function slug(s: string, order: number): string {
  return (
    String(order).padStart(2, "0") +
    "-" +
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60)
  );
}

function toVtt(segments: Array<{ start: number; end: number; text: string }>): string {
  if (!segments || segments.length === 0) return "WEBVTT\n\n";
  const lines = ["WEBVTT", ""];
  segments.forEach((seg, i) => {
    lines.push(String(i + 1));
    lines.push(`${secToVttTime(seg.start)} --> ${secToVttTime(seg.end)}`);
    lines.push(seg.text);
    lines.push("");
  });
  return lines.join("\n");
}

function secToVttTime(s: number): string {
  const ms = Math.round((s % 1) * 1000);
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(sec).padStart(2, "0") +
    "." +
    String(ms).padStart(3, "0")
  );
}

const README = `CourseForge Coursera Import Pack
=================================

This zip is shaped to match Coursera's Course Builder import format.

Structure:
  course.json              — top-level metadata
  modules/<NN-slug>/       — one folder per module
    module.json
    <NN-slug>/             — one folder per lesson
      lesson.json
      videos/<NN-slug>/    — one folder per video
        slides.pptx
        transcript.vtt
        metadata.json
      readings/r*.md
      quizzes/q*.json

Apply via Coursera Course Builder → Import. For partner-program imports, work
with your Coursera point of contact to map module/lesson IDs to existing
Coursera entities, otherwise the importer will create new ones.
`;
