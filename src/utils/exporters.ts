import type {
  DocumentTab,
  FlowNode,
  WorkspaceDocument,
  WorkspaceState,
} from "@/src/types/workspace";
import { sanitizeHtml } from "@/src/security/sanitize-html";
import { safeCsvCell, safeExportFilename } from "@/src/core/workspace-rules";

export type ExportFormat =
  | "pdf"
  | "docx"
  | "md"
  | "html"
  | "txt"
  | "json"
  | "png"
  | "jpg"
  | "svg"
  | "csv"
  | "xlsx";

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  scope: "document" | "tab";
  orientation: "portrait" | "landscape";
  pageSize: "a4" | "letter";
  quality: number;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function assertRasterSize(width: number, height: number, pixelRatio: number) {
  const pixels = width * height * pixelRatio * pixelRatio;
  if (width * pixelRatio > 32_000 || height * pixelRatio > 32_000 || pixels > 80_000_000) {
    throw new Error("El documento es demasiado grande para rasterizarlo. Usa DOCX, HTML o divide el contenido.");
  }
}

function plainText(html: string) {
  const node = document.createElement("div");
  node.innerHTML = sanitizeHtml(html);
  return node.innerText.trim();
}

function htmlToMarkdown(html: string) {
  const root = document.createElement("div");
  root.innerHTML = sanitizeHtml(html);
  root.querySelectorAll("h1,h2,h3").forEach((el) => {
    el.textContent = `${"#".repeat(Number(el.tagName[1]))} ${el.textContent ?? ""}`;
  });
  root.querySelectorAll("strong,b").forEach((el) => {
    el.textContent = `**${el.textContent ?? ""}**`;
  });
  root.querySelectorAll("em,i").forEach((el) => {
    el.textContent = `_${el.textContent ?? ""}_`;
  });
  root.querySelectorAll("blockquote").forEach((el) => {
    el.textContent = `> ${el.textContent ?? ""}`;
  });
  root.querySelectorAll("pre").forEach((el) => {
    el.textContent = `\`\`\`\n${el.textContent ?? ""}\n\`\`\``;
  });
  root.querySelectorAll("li").forEach((el) => {
    const parent = el.parentElement;
    const prefix = parent?.tagName === "OL" ? `${Array.from(parent.children).indexOf(el) + 1}.` : "-";
    el.textContent = `${prefix} ${el.textContent ?? ""}`;
  });
  root.querySelectorAll("a").forEach((el) => {
    el.textContent = `[${el.textContent ?? "enlace"}](${(el as HTMLAnchorElement).href})`;
  });
  return root.innerText.replace(/\n{3,}/g, "\n\n").trim();
}

function selectedTabs(doc: WorkspaceDocument, scope: ExportOptions["scope"]) {
  return scope === "tab"
    ? doc.tabs.filter((tab) => tab.id === doc.activeTabId)
    : doc.tabs;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

function flowSvg(tab: DocumentTab) {
  const nodes = tab.flowNodes ?? [],
    connections = tab.flowConnections ?? [];
  const nodeSize = (node: FlowNode) => ({
    width: node.width ?? 150,
    height: node.height ?? 52,
  });
  const lines = connections
    .map((connection) => {
      const from = nodes.find((node) => node.id === connection.from),
        to = nodes.find((node) => node.id === connection.to);
      if (!from || !to) return "";
      const fs = nodeSize(from),
        ts = nodeSize(to),
        x1 = from.x + fs.width / 2,
        y1 = from.y + fs.height,
        x2 = to.x + ts.width / 2,
        y2 = to.y,
        mid = (y1 + y2) / 2;
      return `<path d="M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}" fill="none" stroke="${connection.color ?? "#7b735f"}" stroke-width="${connection.width ?? 2}" ${connection.dashed ? 'stroke-dasharray="8 6"' : ""} marker-end="url(#arrow)"/>`;
    })
    .join("");
  const shapes = [...nodes]
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    .map((node) => {
      const { width, height } = nodeSize(node),
        fill = node.fill ?? "#fffaf1",
        stroke = node.stroke ?? "#8c806f",
        sw = node.strokeWidth ?? 2;
      const shape =
        node.type === "decision"
          ? `<polygon points="${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}"/>`
          : node.type === "connector"
            ? `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - 2}" ry="${height / 2 - 2}"/>`
            : `<rect width="${width}" height="${height}" rx="${node.type === "start" || node.type === "end" ? height / 2 : 10}"/>`;
      return `<g transform="translate(${node.x},${node.y})" fill="${fill}" stroke="${stroke}" stroke-width="${sw}">${shape}<text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" fill="#33261f" stroke="none" font-family="Arial" font-size="13">${escapeHtml(node.label)}</text></g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700"><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#7b735f"/></marker></defs><rect width="1000" height="700" fill="#f7f1e7"/>${lines}${shapes}</svg>`;
}

function exportTabHtml(tab: DocumentTab) {
  if (tab.kind === "drawing")
    return tab.drawingData
      ? `<img class="visual-export" src="${tab.drawingData}" alt="Dibujo"/>`
      : "<p>Lienzo vacío</p>";
  if (tab.kind === "flowchart") return flowSvg(tab);
  return sanitizeHtml(tab.content);
}

function tabText(tab: DocumentTab) {
  if (tab.kind === "flowchart")
    return (tab.flowNodes ?? []).map((node) => node.label).join(" → ");
  if (tab.kind === "drawing")
    return tab.drawingData ? "Dibujo incluido" : "Lienzo vacío";
  return plainText(tab.content);
}

function spreadsheetRows(tabs: DocumentTab[]) {
  const rows: string[][] = [];
  for (const tab of tabs) {
    const container = document.createElement("div");
    container.innerHTML = exportTabHtml(tab);
    const tables = Array.from(container.querySelectorAll("table"));
    if (!tables.length) rows.push([tab.title, tabText(tab)]);
    else
      for (const table of tables) {
        rows.push([tab.title]);
        rows.push(
          ...Array.from(table.querySelectorAll("tr")).map((row) =>
            Array.from(row.querySelectorAll("th,td")).map(
              (cell) => cell.textContent?.trim() ?? "",
            ),
          ),
        );
      }
  }
  return rows;
}

function xml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
}
function columnName(index: number) {
  let name = "";
  for (
    let current = index + 1;
    current;
    current = Math.floor((current - 1) / 26)
  )
    name = String.fromCharCode(65 + ((current - 1) % 26)) + name;
  return name;
}

async function createXlsx(rows: string[][]) {
  const { strToU8, zipSync } = await import("fflate");
  const worksheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(cell.slice(0, 32767))}</t></is></c>`).join("")}</row>`,
    )
    .join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contenido" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${worksheetRows}</sheetData></worksheet>`,
    ),
  };
  return new Blob([zipSync(files, { level: 6 }) as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function createExportSurface(
  doc: WorkspaceDocument,
  tabs: DocumentTab[],
  state: WorkspaceState,
) {
  const surface = document.createElement("div");
  surface.className = "lumina-export-surface";
  // html-to-image preserves the element's computed position in its SVG clone.
  // Keeping the surface far outside the viewport therefore produces a valid but
  // empty bitmap in Chromium. Render it on-screen, above the app, for the brief
  // capture window and remove it immediately afterwards.
  surface.style.cssText = `position:fixed;left:0;top:0;width:${state.documentWidth === "wide" ? 1040 : state.documentWidth === "compact" ? 680 : 800}px;background:#fbf8f2;color:#33261f;padding:54px;font-family:${state.editorFont === "sans" ? "Arial,sans-serif" : state.editorFont === "mono" ? "monospace" : "Georgia,serif"};font-size:${state.fontSize === "small" ? 14 : state.fontSize === "large" ? 18 : 16}px;line-height:${state.lineHeight === "compact" ? 1.45 : state.lineHeight === "relaxed" ? 2.05 : 1.75};z-index:2147483647;pointer-events:none;`;
  surface.innerHTML = `<header class="export-cover"><small>LÚMINA · AGENDA PERSONAL</small><h1>${escapeHtml(doc.title)}</h1></header>${tabs.map((tab) => `<section class="export-tab"><h2 class="export-tab-title">${escapeHtml(tab.title)}</h2><div class="export-content">${exportTabHtml(tab)}</div></section>`).join("")}`;
  const style = document.createElement("style");
  style.textContent = `.lumina-export-surface *{box-sizing:border-box}.export-cover{padding-bottom:24px;border-bottom:1px solid #cfc1ac;margin-bottom:34px}.export-cover small{letter-spacing:.18em;color:#6f7f5a;font:700 10px Arial}.export-cover h1{font-size:42px;line-height:1.15;margin:10px 0}.export-tab{break-inside:avoid;margin-bottom:42px}.export-tab+.export-tab{border-top:1px solid #cfc1ac;padding-top:32px}.export-tab-title{font:600 25px Georgia;margin:0 0 24px}.export-content h1{font:600 36px/1.2 Georgia}.export-content h2{font:600 24px/1.25 Georgia;margin-top:28px}.export-content h3{font:600 19px/1.3 Georgia}.export-content img,.export-content svg{display:block;max-width:100%;height:auto;margin:24px auto}.export-content figure{break-inside:avoid;margin:24px 0}.export-content figcaption{text-align:center;color:#7e7166;font:12px Arial}.export-content table{border-collapse:collapse;width:100%;break-inside:avoid}.export-content th,.export-content td{border:1px solid #cfc1ac;padding:9px}.export-content pre{white-space:pre-wrap;background:#201b18;color:#f7f2e8;padding:18px;border-radius:8px;break-inside:avoid}.export-content blockquote{border-left:3px solid #6f7f5a;padding:14px 20px;background:#f0ecdf}.visual-export{width:100%}`;
  surface.appendChild(style);
  document.body.appendChild(surface);
  await document.fonts.ready;
  const images = Array.from(surface.querySelectorAll("img"));
  await Promise.all(
    images.map((image) =>
      image.complete && image.naturalWidth
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () =>
              reject(
                new Error("No fue posible cargar una imagen para exportarla."),
              );
          }),
    ),
  );
  return surface;
}

function safeSliceY(canvas: HTMLCanvasElement, desired: number, min: number) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return desired;
  const start = min,
    end = Math.min(canvas.height - 1, desired + 30),
    width = canvas.width;
  const blankRow = (y: number) => {
    const data = context.getImageData(0, Math.max(0, y), width, 2).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 16)
      if (data[i] < 242 || data[i + 1] < 239 || data[i + 2] < 232) colored++;
    return colored < width * 0.004;
  };
  // Require a real whitespace band. A single blank scanline also appears
  // between two lines of the same paragraph or list and caused awkward cuts.
  for (let y = desired; y >= start; y -= 4)
    if (blankRow(y - 18) && blankRow(y) && blankRow(y + 18)) return y;
  return Math.min(end, desired);
}

function contentBottomY(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas.height;
  for (let y = canvas.height - 1; y > 0; y -= 4) {
    const data = context.getImageData(0, y, canvas.width, 2).data;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] < 242 || data[i + 1] < 239 || data[i + 2] < 232)
        return Math.min(canvas.height, y + 96);
    }
  }
  return Math.min(canvas.height, 1);
}

export async function exportWorkspaceDocument(
  doc: WorkspaceDocument,
  state: WorkspaceState,
  options: ExportOptions,
  target?: HTMLElement | null,
) {
  const tabs = selectedTabs(doc, options.scope);
  const base = safeExportFilename(options.filename);
  const combinedText = tabs
    .map((tab) => `${tab.title}\n\n${tabText(tab)}`)
    .join("\n\n──────────\n\n");
  const combinedHtml = tabs
    .map(
      (tab) =>
        `<section><h1>${escapeHtml(tab.title)}</h1>${exportTabHtml(tab)}</section>`,
    )
    .join("");

  if (options.format === "json") {
    download(
      new Blob(
        [JSON.stringify(options.scope === "tab" ? tabs[0] : doc, null, 2)],
        { type: "application/json" },
      ),
      `${base}.json`,
    );
    return;
  }
  if (options.format === "txt") {
    download(
      new Blob([combinedText], { type: "text/plain;charset=utf-8" }),
      `${base}.txt`,
    );
    return;
  }
  if (options.format === "md") {
    const markdown = tabs
      .map(
        (tab) =>
          `# ${tab.title.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&")}\n\n${tab.kind === "document" ? htmlToMarkdown(tab.content) : tabText(tab)}`,
      )
      .join("\n\n---\n\n");
    download(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      `${base}.md`,
    );
    return;
  }
  if (options.format === "html") {
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(doc.title)}</title><style>body{font:16px/1.65 system-ui;color:#20242e;max-width:820px;margin:48px auto;padding:0 28px}h1{font-size:36px}img,svg{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:9px}pre{background:#111827;color:#f8fafc;padding:18px;border-radius:10px;white-space:pre-wrap}section+section{border-top:1px solid #ddd;margin-top:48px;padding-top:32px}</style></head><body><header><small>Exportado desde Mi Diario</small><h1>${escapeHtml(doc.title)}</h1></header>${combinedHtml}</body></html>`;
    download(
      new Blob([html], { type: "text/html;charset=utf-8" }),
      `${base}.html`,
    );
    return;
  }
  if (options.format === "pdf") {
    const [{ jsPDF }, { toCanvas }] = await Promise.all([
      import("jspdf"),
      import("html-to-image"),
    ]);
    const surface = await createExportSurface(doc, tabs, state);
    try {
      assertRasterSize(surface.scrollWidth, surface.scrollHeight, 2);
      const canvas = await toCanvas(surface, {
        pixelRatio: 2,
        backgroundColor: "#fbf8f2",
        cacheBust: true,
        skipFonts: false,
      });
      const pdf = new jsPDF({
        orientation: options.orientation,
        format: options.pageSize,
        unit: "mm",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth(),
        pageHeight = pdf.internal.pageSize.getHeight(),
        margin = 10,
        usableW = pageWidth - margin * 2,
        usableH = pageHeight - margin * 2;
      const sliceHeight = Math.floor((canvas.width * usableH) / usableW),
        pageContentHeight = Math.max(1, sliceHeight - 160),
        effectiveHeight = contentBottomY(canvas);
      let offset = 0,
        page = 0;
      while (offset < effectiveHeight) {
        const desired = Math.min(effectiveHeight, offset + pageContentHeight);
        const end =
          desired < effectiveHeight
            ? safeSliceY(
                canvas,
                desired,
                offset + Math.floor(pageContentHeight * 0.55),
              )
            : desired;
        const height = Math.max(1, end - offset);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = height;
        pageCanvas
          .getContext("2d")
          ?.drawImage(
            canvas,
            0,
            offset,
            canvas.width,
            height,
            0,
            0,
            canvas.width,
            height,
          );
        if (page > 0) pdf.addPage();
        const renderedH = (height * usableW) / canvas.width;
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.94),
          "JPEG",
          margin,
          margin,
          usableW,
          renderedH,
          undefined,
          "FAST",
        );
        offset = end;
        page++;
      }
      pdf.save(`${base}.pdf`);
    } finally {
      surface.remove();
    }
    return;
  }
  if (options.format === "docx") {
    const { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph } = await import("docx");
    const children = tabs.flatMap((tab) => {
      const heading = new Paragraph({ text: tab.title, heading: HeadingLevel.HEADING_1 });
      if (tab.kind !== "document") {
        return [heading, ...tabText(tab).split(/\n+/).filter(Boolean).map((line) => new Paragraph(line))];
      }
      const root = document.createElement("div");
      root.innerHTML = sanitizeHtml(tab.content);
      const blocks = Array.from(root.children).flatMap((element) => {
        const text = element.textContent?.trim() ?? "";
        if (!text) return [];
        if (/^H[1-3]$/.test(element.tagName)) {
          const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
          return [new Paragraph({ text, heading: levels[Number(element.tagName[1]) - 1] })];
        }
        if (element.tagName === "UL") {
          return Array.from(element.children).map((item) => new Paragraph({ text: item.textContent?.trim() ?? "", bullet: { level: 0 } }));
        }
        if (element.tagName === "OL") {
          return Array.from(element.children).map((item) => new Paragraph({ text: item.textContent?.trim() ?? "", numbering: { reference: "ordered-list", level: 0 } }));
        }
        if (element.tagName === "TABLE") {
          return Array.from(element.querySelectorAll("tr")).map((row) => new Paragraph(Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? "").join("    ")));
        }
        return [new Paragraph(text)];
      });
      return [heading, ...blocks];
    });
    const file = new Document({
      numbering: { config: [{ reference: "ordered-list", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }] }] },
      sections: [{ children }],
    });
    download(await Packer.toBlob(file), `${base}.docx`);
    return;
  }
  if (options.format === "csv" || options.format === "xlsx") {
    const rows = spreadsheetRows(tabs);
    if (options.format === "csv") {
      const csv = rows
        .map((row) =>
          row.map(safeCsvCell).join(","),
        )
        .join("\r\n");
      download(
        new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
        `${base}.csv`,
      );
    } else {
      download(await createXlsx(rows), `${base}.xlsx`);
    }
    return;
  }
  if (options.format === "png" || options.format === "jpg") {
    if (!target) throw new Error("No hay una vista disponible para exportar.");
    const { toJpeg, toPng } = await import("html-to-image");
    assertRasterSize(target.scrollWidth, target.scrollHeight, 2);
    const captureOptions = {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: target.scrollWidth,
      height: target.scrollHeight,
    };
    const dataUrl =
      options.format === "png"
        ? await toPng(target, captureOptions)
        : await toJpeg(target, {
            ...captureOptions,
            quality: options.quality,
          });
    const response = await fetch(dataUrl);
    download(await response.blob(), `${base}.${options.format}`);
    return;
  }
  if (options.format === "svg") {
    const width = target?.scrollWidth ?? 900;
    const height = target?.scrollHeight ?? 1200;
    const serialized = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;padding:32px;background:white;color:#20242e">${combinedHtml}</div></foreignObject></svg>`;
    download(
      new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
      `${base}.svg`,
    );
  }
}

export function downloadBackup(state: WorkspaceState) {
  const payload = {
    format: "lumina-workspace",
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
  };
  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `lumina-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
}
