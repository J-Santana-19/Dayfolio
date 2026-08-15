import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  localDateKey,
  localizedMonthTag,
  safeCsvCell,
  safeExportFilename,
  shiftedMonthStart,
} from "../src/core/workspace-rules.ts";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Mi Diario shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.match(response.headers.get("strict-transport-security") ?? "", /^max-age=63072000/);
  assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/);
  assert.match(response.headers.get("content-security-policy") ?? "", /script-src-attr 'none'/);

  const html = await response.text();
  assert.match(html, /<html lang="es">/i);
  assert.match(html, /<title>Mi Diario — Notas y calendario<\/title>/i);
  assert.match(html, /Abriendo tu agenda…/);
  assert.match(html, /class="app-loading"/);
  assert.match(html, /property="og:image"[^>]+\/og\.png/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("ships the calendar, local persistence and social artwork", async () => {
  const [page, calendar, calendarStyles, workspace, editor, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/calendar-view.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/calendar-view.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/hooks/use-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/editor/rich-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<WorkspaceApp \/>/);
  assert.match(calendar, /Calendario del diario/);
  assert.match(calendar, /calendar-day/);
  assert.match(calendar, /"week", "Semana"/);
  assert.match(calendar, /"list", "Lista"/);
  assert.match(calendarStyles, /calendar-view-switcher/);
  assert.match(calendarStyles, /@media \(max-width: 760px\)/);
  assert.match(workspace, /createDailyNoteForDate/);
  assert.match(workspace, /saveWorkspace/);
  assert.match(editor, /useLayoutEffect/);
  assert.match(editor, /lastContent\.current/);
  assert.match(layout, /summary_large_image/);
  await access(new URL("../public/og.png", import.meta.url));
});

test("ships the productivity, diagram and visual-export upgrades", async () => {
  const [workspaceApp, flowchart, exporters, settings, workspaceTypes] =
    await Promise.all([
      readFile(
        new URL("../src/components/workspace-app.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../src/flowchart/flowchart-editor.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/utils/exporters.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../src/components/settings-dialog.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/types/workspace.ts", import.meta.url), "utf8"),
    ]);

  assert.match(workspaceApp, /focusMode/);
  assert.match(workspaceApp, /workspaceZoom/);
  assert.match(flowchart, /selectionBox/);
  assert.match(flowchart, /groupId/);
  assert.match(flowchart, /selectedConnection/);
  assert.match(exporters, /toCanvas/);
  assert.match(exporters, /contentBottomY/);
  assert.match(exporters, /drawingData/);
  assert.match(exporters, /flowSvg/);
  assert.match(settings, /snapToGrid/);
  assert.match(settings, /toolbarMode/);
  assert.match(workspaceTypes, /"subprocess"/);
  assert.match(workspaceTypes, /strokeWidth/);
});

test("ships validation, HTML sanitization and bounded histories", async () => {
  const [validation, sanitizer, drawing, flowchart, manifest] = await Promise.all([
    readFile(new URL("../src/database/validation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/security/sanitize-html.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/drawing/drawing-canvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/flowchart/flowchart-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(validation, /parseWorkspaceBackup/);
  assert.match(validation, /MAX_BACKUP_BYTES/);
  assert.match(sanitizer, /DROP_WITH_CONTENT/);
  assert.match(sanitizer, /sanitizeLinkUrl/);
  assert.match(drawing, /MAX_HISTORY = 8/);
  assert.match(drawing, /undoStack = useRef<string\[\]>/);
  assert.doesNotMatch(drawing, /undoStack = useRef<ImageData\[\]>/);
  assert.match(flowchart, /MAX_HISTORY = 50/);
  assert.doesNotMatch(manifest, /"xlsx"\s*:/);
});

test("keeps the video-feedback interactions integrated and responsive", async () => {
  const [workspace, editor, flowchart, dialog, sanitizer, styles] = await Promise.all([
    readFile(new URL("../src/components/workspace-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/editor/rich-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/flowchart/flowchart-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/text-input-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/security/sanitize-html.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /addEventListener\("change", handler\)/);
  assert.match(workspace, /mobile-sidebar-scrim/);
  assert.doesNotMatch(`${workspace}${editor}${flowchart}`, /window\.(?:prompt|alert)\(/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(editor, /command === "checklist"/);
  assert.match(editor, /onClick=\{onClick\}/);
  assert.match(editor, /onKeyUp=\{captureSelection\}/);
  assert.match(sanitizer, /"checklist"/);
  assert.match(styles, /\.rich-editor a\{/);
  assert.match(styles, /ul\.checklist/);
  assert.match(styles, /list-style-type:disc!important/);
  assert.match(styles, /list-style-type:decimal!important/);
  assert.match(styles, /Classic bound notebook/);
});

test("moves calendar selection with the visible month, including year boundaries", () => {
  assert.equal(localDateKey(shiftedMonthStart(2026, 7, 1)), "2026-09-01");
  assert.equal(localDateKey(shiftedMonthStart(2026, 0, -1)), "2025-12-01");
  assert.equal(localDateKey(new Date(2028, 1, 29, 12)), "2028-02-29");
});

test("creates the journal month tag from the actual local date", () => {
  assert.equal(localizedMonthTag(new Date(2026, 0, 15, 12), "es-PA"), "enero");
  assert.equal(localizedMonthTag(new Date(2026, 11, 15, 12), "es-PA"), "diciembre");
});

test("normalizes unsafe and reserved export filenames", () => {
  assert.equal(safeExportFilename("  Informe: agosto.  "), "Informe- agosto");
  assert.equal(safeExportFilename("CON"), "Documento-CON");
  assert.equal(safeExportFilename("   "), "Documento");
});

test("neutralizes spreadsheet formulas and escapes CSV quotes", () => {
  assert.equal(safeCsvCell("=HYPERLINK(\"https://invalid\")"), "\"'=HYPERLINK(\"\"https://invalid\"\")\"");
  assert.equal(safeCsvCell("texto normal"), "\"texto normal\"");
});
