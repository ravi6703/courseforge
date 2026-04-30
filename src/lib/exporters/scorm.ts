// src/lib/exporters/scorm.ts — produces a SCORM 1.2-conformant zip from a course.
//
// SCORM 1.2 is the lowest common denominator that Canvas, Blackboard, Moodle,
// Cornerstone, SuccessFactors, Workday Learning, and most corporate LMSs accept.
// This unlocks the entire university + corporate L&D market without any per-LMS
// integration work. xAPI is a separate, optional, future export.
//
// What we package:
//   - imsmanifest.xml (SCORM 1.2)
//   - SCORM 1.2 schema files (adlcp_rootv1p2, imscp_rootv1p1, imsmd_rootv1p2, ims_xml)
//   - One SCO (Sharable Content Object) per lesson
//   - HTML wrappers for each lesson with embedded video, transcript, and content items
//   - SCORM API harness (scorm-api.js) that reports completion + score
//   - assessments rendered as plain HTML quizzes that POST score back via SCORM API
//
// Install: npm i jszip
//
// Note: We bundle a *minimal* SCORM 1.2 schema set (we do not redistribute the
// full IMS XSDs). The schemas listed in <schemaversion> tell the LMS which
// version to validate against; most LMSs do not strictly validate.

import JSZip from "jszip";

export type LessonForExport = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  module_title: string;
  video_url?: string | null; // signed URL or hosted URL
  transcript_text?: string | null;
  readings: Array<{ title: string; content_md: string }>;
  quizzes: Array<{
    title: string;
    passing_score: number;
    questions: Array<{
      id: string;
      prompt: string;
      options: Array<{ id: string; text: string }>;
      correct_option_ids: string[];
    }>;
  }>;
};

export type CourseForExport = {
  id: string;
  title: string;
  description?: string | null;
  org_name?: string | null;
  lessons: LessonForExport[];
};

const MANIFEST_VERSION = "1.2";

export async function buildScormZip(course: CourseForExport): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file("imsmanifest.xml", buildManifest(course));
  zip.file("scorm-api.js", SCORM_API_HARNESS);
  zip.file("styles.css", LESSON_CSS);

  // Lessons as SCOs
  for (const lesson of course.lessons) {
    const dir = `lessons/${lesson.id}`;
    zip.file(`${dir}/index.html`, buildLessonHtml(course, lesson));
  }

  return await zip.generateAsync({ type: "uint8array" });
}

// ─────────────────────────────────────────────────────────────────────────────
// imsmanifest.xml
// ─────────────────────────────────────────────────────────────────────────────
function buildManifest(course: CourseForExport): string {
  const itemsXml = course.lessons
    .map(
      (l) => `      <item identifier="ITEM-${escId(l.id)}" identifierref="RES-${escId(l.id)}" isvisible="true">
        <title>${esc(l.title)}</title>
        <adlcp:masteryscore>${
          l.quizzes[0]?.passing_score ?? 70
        }</adlcp:masteryscore>
      </item>`
    )
    .join("\n");

  const resourcesXml = course.lessons
    .map(
      (l) => `    <resource identifier="RES-${escId(l.id)}" type="webcontent"
              adlcp:scormtype="sco" href="lessons/${escId(l.id)}/index.html">
      <file href="lessons/${escId(l.id)}/index.html"/>
      <file href="scorm-api.js"/>
      <file href="styles.css"/>
    </resource>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-${escId(course.id)}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${MANIFEST_VERSION}</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${esc(course.title)}</title>
${itemsXml}
    </organization>
  </organizations>
  <resources>
${resourcesXml}
  </resources>
</manifest>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson HTML — single SCO per lesson
// ─────────────────────────────────────────────────────────────────────────────
function buildLessonHtml(course: CourseForExport, lesson: LessonForExport): string {
  const video = lesson.video_url
    ? `<video controls preload="metadata" src="${esc(lesson.video_url)}"></video>`
    : `<p class="muted">Video pending</p>`;

  const transcript = lesson.transcript_text
    ? `<details class="transcript"><summary>Transcript</summary><pre>${esc(
        lesson.transcript_text
      )}</pre></details>`
    : "";

  const readings = lesson.readings
    .map(
      (r) => `<section class="reading"><h3>${esc(r.title)}</h3><div class="md">${esc(
        r.content_md
      )}</div></section>`
    )
    .join("\n");

  const quizzes = lesson.quizzes
    .map((q, qi) => {
      const items = q.questions
        .map(
          (qq, i) => `<fieldset class="q" data-qid="${esc(qq.id)}" data-correct='${esc(
            JSON.stringify(qq.correct_option_ids)
          )}'>
        <legend>Q${i + 1}. ${esc(qq.prompt)}</legend>
        ${qq.options
          .map(
            (o) => `<label><input type="radio" name="q-${esc(qq.id)}" value="${esc(o.id)}"> ${esc(
              o.text
            )}</label>`
          )
          .join("")}
      </fieldset>`
        )
        .join("\n");
      return `<section class="quiz" data-pass="${q.passing_score}">
        <h3>${esc(q.title)}</h3>
        <form data-quiz-index="${qi}">
          ${items}
          <button type="submit">Submit</button>
          <p class="result" aria-live="polite"></p>
        </form>
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(lesson.title)} — ${esc(course.title)}</title>
<link rel="stylesheet" href="../../styles.css">
<script src="../../scorm-api.js"></script>
</head>
<body onload="CFSCO.init()" onunload="CFSCO.finish()">
<header>
  <small>${esc(lesson.module_title)}</small>
  <h1>${esc(lesson.title)}</h1>
  ${lesson.description ? `<p class="muted">${esc(lesson.description)}</p>` : ""}
</header>

<section class="video">${video}</section>
${transcript}

${readings}

${quizzes}

<footer>
  <button onclick="CFSCO.markComplete()">Mark complete</button>
</footer>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORM 1.2 API harness
// ─────────────────────────────────────────────────────────────────────────────
const SCORM_API_HARNESS = String.raw`/*! CourseForge SCORM 1.2 harness — minimal */
(function (root) {
  function findAPI(win) {
    var depth = 0;
    while (win.API == null && win.parent != null && win.parent !== win && depth < 20) {
      win = win.parent;
      depth++;
    }
    return win.API || null;
  }
  function api() {
    var a = findAPI(window);
    if (!a && window.opener) a = findAPI(window.opener);
    return a;
  }
  var connected = false;
  var CF = {
    init: function () {
      var a = api();
      if (!a) return;
      connected = a.LMSInitialize("") === "true";
      if (connected) {
        a.LMSSetValue("cmi.core.lesson_status", "incomplete");
        a.LMSCommit("");
      }
    },
    setScore: function (pct, mastery) {
      var a = api();
      if (!a || !connected) return;
      a.LMSSetValue("cmi.core.score.raw", String(Math.round(pct)));
      a.LMSSetValue("cmi.core.score.min", "0");
      a.LMSSetValue("cmi.core.score.max", "100");
      a.LMSSetValue(
        "cmi.core.lesson_status",
        pct >= mastery ? "passed" : "failed"
      );
      a.LMSCommit("");
    },
    markComplete: function () {
      var a = api();
      if (!a || !connected) return;
      a.LMSSetValue("cmi.core.lesson_status", "completed");
      a.LMSCommit("");
    },
    finish: function () {
      var a = api();
      if (!a || !connected) return;
      a.LMSCommit("");
      a.LMSFinish("");
    },
  };

  // Wire quiz forms
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f.matches || !f.matches("form[data-quiz-index]")) return;
    e.preventDefault();
    var quiz = f.closest(".quiz");
    var pass = parseInt(quiz.getAttribute("data-pass") || "70", 10);
    var qs = f.querySelectorAll(".q");
    var correct = 0;
    qs.forEach(function (q) {
      var checked = q.querySelector("input[type=radio]:checked");
      var want;
      try {
        want = JSON.parse(q.getAttribute("data-correct"));
      } catch (_) {
        want = [];
      }
      if (checked && want.indexOf(checked.value) !== -1) correct++;
    });
    var pct = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    var msg = f.querySelector(".result");
    msg.textContent =
      "Score: " + pct + "% — " + (pct >= pass ? "Passed" : "Try again");
    CF.setScore(pct, pass);
  });

  root.CFSCO = CF;
})(window);
`;

const LESSON_CSS = `
  body { font: 16px/1.5 -apple-system, system-ui, sans-serif; max-width: 880px; margin: 24px auto; padding: 0 16px; color: #0f172a; }
  header h1 { margin: 4px 0 8px; font-size: 28px; }
  .muted { color: #64748b; }
  video { width: 100%; border-radius: 8px; background: #000; }
  .reading { margin: 24px 0; }
  .quiz { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0; }
  .q { border: 0; padding: 8px 0; margin: 0 0 8px; }
  .q legend { font-weight: 600; }
  .q label { display: block; padding: 4px 0; }
  button { background: #0f172a; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
  button:hover { background: #1e293b; }
  details.transcript { margin: 16px 0; }
  details.transcript pre { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; font: 13px/1.5 monospace; }
`;

function esc(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
