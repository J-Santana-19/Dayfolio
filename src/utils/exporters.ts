import type { WorkspaceDocument, WorkspaceState } from "@/src/types/workspace";

export type ExportFormat = "pdf" | "docx" | "md" | "html" | "txt" | "json" | "png" | "jpg" | "svg" | "csv" | "xlsx";

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  scope: "document" | "tab";
  orientation: "portrait" | "landscape";
  pageSize: "a4" | "letter";
  quality: number;
}

const cleanName = (name: string) => name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "Documento";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function plainText(html: string) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.innerText.trim();
}

function htmlToMarkdown(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll("h1,h2,h3").forEach((el) => { el.textContent = `${"#".repeat(Number(el.tagName[1]))} ${el.textContent ?? ""}`; });
  root.querySelectorAll("strong,b").forEach((el) => { el.textContent = `**${el.textContent ?? ""}**`; });
  root.querySelectorAll("em,i").forEach((el) => { el.textContent = `_${el.textContent ?? ""}_`; });
  root.querySelectorAll("blockquote").forEach((el) => { el.textContent = `> ${el.textContent ?? ""}`; });
  root.querySelectorAll("pre").forEach((el) => { el.textContent = `\`\`\`\n${el.textContent ?? ""}\n\`\`\``; });
  root.querySelectorAll("li").forEach((el) => { el.textContent = `- ${el.textContent ?? ""}`; });
  root.querySelectorAll("a").forEach((el) => { el.textContent = `[${el.textContent ?? "enlace"}](${(el as HTMLAnchorElement).href})`; });
  return root.innerText.replace(/\n{3,}/g, "\n\n").trim();
}

function selectedTabs(doc: WorkspaceDocument, scope: ExportOptions["scope"]) {
  return scope === "tab" ? doc.tabs.filter((tab) => tab.id === doc.activeTabId) : doc.tabs;
}

export async function exportWorkspaceDocument(doc: WorkspaceDocument, state: WorkspaceState, options: ExportOptions, target?: HTMLElement | null) {
  const tabs = selectedTabs(doc, options.scope);
  const base = cleanName(options.filename);
  const combinedText = tabs.map((tab) => `${tab.title}\n\n${plainText(tab.content)}`).join("\n\n──────────\n\n");
  const combinedHtml = tabs.map((tab) => `<section><h1>${tab.title}</h1>${tab.content || `<p>Contenido visual: ${tab.kind}</p>`}</section>`).join("");

  if (options.format === "json") {
    download(new Blob([JSON.stringify(options.scope === "tab" ? tabs[0] : doc, null, 2)], { type: "application/json" }), `${base}.json`);
    return;
  }
  if (options.format === "txt") {
    download(new Blob([combinedText], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
    return;
  }
  if (options.format === "md") {
    const markdown = tabs.map((tab) => `# ${tab.title}\n\n${htmlToMarkdown(tab.content)}`).join("\n\n---\n\n");
    download(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `${base}.md`);
    return;
  }
  if (options.format === "html") {
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${doc.title}</title><style>body{font:16px/1.65 system-ui;color:#20242e;max-width:820px;margin:48px auto;padding:0 28px}h1{font-size:36px}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:9px}pre{background:#111827;color:#f8fafc;padding:18px;border-radius:10px;white-space:pre-wrap}section+section{border-top:1px solid #ddd;margin-top:48px;padding-top:32px}</style></head><body><header><small>Exportado desde Lúmina</small><h1>${doc.title}</h1></header>${combinedHtml}</body></html>`;
    download(new Blob([html], { type: "text/html;charset=utf-8" }), `${base}.html`);
    return;
  }
  if (options.format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: options.orientation, format: options.pageSize });
    const width = pdf.internal.pageSize.getWidth() - 30;
    const lines = pdf.splitTextToSize(`${doc.title}\n\n${combinedText}`, width) as string[];
    let y = 18;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    lines.forEach((line) => {
      if (y > pdf.internal.pageSize.getHeight() - 16) { pdf.addPage(); y = 18; }
      pdf.text(line, 15, y); y += 6;
    });
    pdf.save(`${base}.pdf`);
    return;
  }
  if (options.format === "docx") {
    const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
    const children = tabs.flatMap((tab) => [new Paragraph({ text: tab.title, heading: HeadingLevel.HEADING_1 }), ...plainText(tab.content).split(/\n+/).filter(Boolean).map((line) => new Paragraph(line))]);
    const file = new Document({ sections: [{ children }] });
    download(await Packer.toBlob(file), `${base}.docx`);
    return;
  }
  if (options.format === "csv" || options.format === "xlsx") {
    const table = target?.querySelector("table");
    const rows = table ? Array.from(table.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? "")) : tabs.map((tab) => [tab.title, plainText(tab.content)]);
    if (options.format === "csv") {
      const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
      download(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
    } else {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Contenido");
      XLSX.writeFile(book, `${base}.xlsx`);
    }
    return;
  }
  if (options.format === "png" || options.format === "jpg") {
    if (!target) throw new Error("No hay una vista disponible para exportar.");
    const { toJpeg, toPng } = await import("html-to-image");
    const dataUrl = options.format === "png" ? await toPng(target, { pixelRatio: 2, backgroundColor: "#ffffff" }) : await toJpeg(target, { pixelRatio: 2, quality: options.quality, backgroundColor: "#ffffff" });
    const response = await fetch(dataUrl);
    download(await response.blob(), `${base}.${options.format}`);
    return;
  }
  if (options.format === "svg") {
    const width = target?.scrollWidth ?? 900;
    const height = target?.scrollHeight ?? 1200;
    const serialized = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;padding:32px;background:white;color:#20242e">${combinedHtml}</div></foreignObject></svg>`;
    download(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`);
  }
}

export function downloadBackup(state: WorkspaceState) {
  const payload = { format: "lumina-workspace", version: 1, exportedAt: new Date().toISOString(), state };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `lumina-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

