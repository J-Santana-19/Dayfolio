import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Lúmina shell and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="es">/i);
  assert.match(html, /<title>Lúmina — Tu agenda personal<\/title>/i);
  assert.match(html, /Abriendo tu agenda…/);
  assert.match(html, /class="app-loading"/);
  assert.match(html, /property="og:image"[^>]+\/og\.png/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("ships the calendar, local persistence and social artwork", async () => {
  const [page, calendar, workspace, editor, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/calendar-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/use-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/editor/rich-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<WorkspaceApp \/>/);
  assert.match(calendar, /Calendario del diario/);
  assert.match(calendar, /calendar-day/);
  assert.match(workspace, /createDailyNoteForDate/);
  assert.match(workspace, /saveWorkspace/);
  assert.match(editor, /useLayoutEffect/);
  assert.match(editor, /lastContent\.current/);
  assert.match(layout, /summary_large_image/);
  await access(new URL("../public/og.png", import.meta.url));
});
