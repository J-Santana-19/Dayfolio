import {
  createDocument,
  createInitialState,
  createTab,
  uid,
} from "@/src/database/initial-data";
import {
  isSafeRasterDataUrl,
  sanitizeHtml,
} from "@/src/security/sanitize-html";
import type {
  DocumentTab,
  FlowConnection,
  FlowNode,
  FlowNodeType,
  VersionSnapshot,
  WorkspaceDocument,
  WorkspaceFolder,
  WorkspaceState,
} from "@/src/types/workspace";

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const MAX_DOCUMENTS = 250;
const MAX_TABS = 30;
const MAX_CONTENT_LENGTH = 12_000_000;
const MAX_NODES = 2_000;
const MAX_CONNECTIONS = 5_000;
const NODE_TYPES = new Set<FlowNodeType>([
  "start",
  "input",
  "decision",
  "process",
  "output",
  "subprocess",
  "connector",
  "end",
]);
const FOLDERS = new Set(["Diario", "Universidad", "Proyectos", "Notas"]);

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, fallback: string, max: number) =>
  typeof value === "string" ? value.slice(0, max) : fallback;
const finite = (
  value: unknown,
  fallback: number,
  min = -10_000,
  max = 10_000,
) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const enumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
const uniqueId = (value: unknown, prefix: string, used: Set<string>) => {
  let id = text(value, "", 160).trim();
  if (!id || used.has(id)) id = uid(prefix);
  used.add(id);
  return id;
};

function validDateKey(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ||
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` !==
      value
    ? undefined
    : value;
}

function normalizeNode(
  value: unknown,
  index: number,
  used: Set<string>,
): FlowNode | null {
  const input = objectValue(value);
  const type = text(input.type, "", 20) as FlowNodeType;
  if (!NODE_TYPES.has(type)) return null;
  return {
    id: uniqueId(input.id, "node", used),
    type,
    label: text(input.label, "Sin texto", 500),
    x: finite(input.x, 100),
    y: finite(input.y, 100),
    width: finite(input.width, type === "connector" ? 62 : 150, 32, 2_000),
    height: finite(input.height, type === "connector" ? 62 : 52, 28, 2_000),
    fill: color(input.fill, "#fffaf1"),
    stroke: color(input.stroke, "#8c806f"),
    strokeWidth: finite(input.strokeWidth, 2, 1, 12),
    zIndex: finite(input.zIndex, index, -10_000, 10_000),
    groupId: text(input.groupId, "", 160) || undefined,
  };
}

function normalizeConnections(
  values: unknown,
  nodes: FlowNode[],
): FlowConnection[] {
  if (!Array.isArray(values)) return [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const used = new Set<string>();
  return values.slice(0, MAX_CONNECTIONS).flatMap((value) => {
    const input = objectValue(value);
    const from = text(input.from, "", 160);
    const to = text(input.to, "", 160);
    if (!nodeIds.has(from) || !nodeIds.has(to) || from === to) return [];
    return [
      {
        id: uniqueId(input.id, "connection", used),
        from,
        to,
        label: text(input.label, "", 300) || undefined,
        color: color(input.color, "#7b735f"),
        width: finite(input.width, 2, 1, 12),
        dashed: bool(input.dashed, false),
      },
    ];
  });
}

function normalizeTab(value: unknown, used: Set<string>): DocumentTab {
  const input = objectValue(value);
  const kind = enumValue(
    input.kind,
    ["document", "drawing", "flowchart"] as const,
    "document",
  );
  const fallback = createTab(kind);
  const nodeIds = new Set<string>();
  const flowNodes = Array.isArray(input.flowNodes)
    ? input.flowNodes
        .slice(0, MAX_NODES)
        .map((node, index) => normalizeNode(node, index, nodeIds))
        .filter((node): node is FlowNode => Boolean(node))
    : [];
  return {
    id: uniqueId(input.id, "tab", used),
    title: text(input.title, fallback.title, 120).trim() || fallback.title,
    icon: text(input.icon, fallback.icon, 8),
    color: color(input.color, fallback.color),
    kind,
    content: sanitizeHtml(text(input.content, "", MAX_CONTENT_LENGTH)),
    drawingData: isSafeRasterDataUrl(input.drawingData)
      ? input.drawingData
      : undefined,
    flowNodes,
    flowConnections: normalizeConnections(input.flowConnections, flowNodes),
  };
}

function normalizeVersions(value: unknown): VersionSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((entry) => {
    const input = objectValue(entry);
    const tabIds = new Set<string>();
    const tabs = Array.isArray(input.tabs)
      ? input.tabs.slice(0, MAX_TABS).map((tab) => normalizeTab(tab, tabIds))
      : [];
    return {
      id: text(input.id, uid("version"), 160),
      createdAt: finite(input.createdAt, Date.now(), 0, 8.64e15),
      label: text(input.label, "Versión", 120),
      tabs: tabs.length ? tabs : [createTab()],
    };
  });
}

function normalizeDocument(
  value: unknown,
  used: Set<string>,
): WorkspaceDocument {
  const input = objectValue(value);
  const now = Date.now();
  const tabIds = new Set<string>();
  const tabs = Array.isArray(input.tabs)
    ? input.tabs.slice(0, MAX_TABS).map((tab) => normalizeTab(tab, tabIds))
    : [];
  if (!tabs.length) tabs.push(createTab());
  const folder = text(input.folder, "Notas", 40);
  const activeTabId = text(input.activeTabId, "", 160);
  return {
    id: uniqueId(input.id, "doc", used),
    title:
      text(input.title, "Nota sin título", 240).trim() || "Nota sin título",
    emoji: text(input.emoji, "✦", 8),
    folder: FOLDERS.has(folder) ? folder as WorkspaceFolder : "Notas",
    tags: [
      ...new Set(
        (Array.isArray(input.tags) ? input.tags : [])
          .map((tag) => text(tag, "", 40).replace(/^#/, "").trim())
          .filter(Boolean),
      ),
    ].slice(0, 20),
    favorite: bool(input.favorite, false),
    trashed: bool(input.trashed, false),
    createdAt: finite(input.createdAt, now, 0, 8.64e15),
    updatedAt: finite(input.updatedAt, now, 0, 8.64e15),
    activeTabId: tabs.some((tab) => tab.id === activeTabId)
      ? activeTabId
      : tabs[0].id,
    tabs,
    versions: normalizeVersions(input.versions),
    journalDate: validDateKey(input.journalDate),
  };
}

export function normalizeWorkspaceState(value: unknown): WorkspaceState {
  const input = objectValue(value);
  const defaults = createInitialState();
  const documentIds = new Set<string>();
  const documents = Array.isArray(input.documents)
    ? input.documents
        .slice(0, MAX_DOCUMENTS)
        .map((doc) => normalizeDocument(doc, documentIds))
    : [];
  if (!documents.length) documents.push(createDocument());
  if (!documents.some((doc) => !doc.trashed)) documents.push(createDocument());
  const requestedActive = text(input.activeDocumentId, "", 160);
  const activeDocumentId = documents.some(
    (doc) => doc.id === requestedActive && !doc.trashed,
  )
    ? requestedActive
    : documents.find((doc) => !doc.trashed)!.id;
  const requestedWorkspaceName = text(input.workspaceName, defaults.workspaceName, 120).trim();
  const workspaceName = /^(?:mi agenda|lúmina)$/i.test(requestedWorkspaceName)
    ? defaults.workspaceName
    : requestedWorkspaceName || defaults.workspaceName;
  return {
    workspaceName,
    folderNames: (() => {
      const names = objectValue(input.folderNames);
      return Object.fromEntries(
        [...FOLDERS].map((folder) => [
          folder,
          text(names[folder], defaults.folderNames[folder as keyof typeof defaults.folderNames], 40).trim() ||
            defaults.folderNames[folder as keyof typeof defaults.folderNames],
        ]),
      ) as WorkspaceState["folderNames"];
    })(),
    documents,
    activeDocumentId,
    theme: enumValue(input.theme, ["light", "dark"] as const, defaults.theme),
    accent: color(input.accent, defaults.accent),
    documentWidth: enumValue(
      input.documentWidth,
      ["compact", "comfortable", "wide"] as const,
      defaults.documentWidth,
    ),
    editorFont: enumValue(
      input.editorFont,
      ["serif", "sans", "mono"] as const,
      defaults.editorFont,
    ),
    fontSize: enumValue(
      input.fontSize,
      ["small", "medium", "large"] as const,
      defaults.fontSize,
    ),
    lineHeight: enumValue(
      input.lineHeight,
      ["compact", "comfortable", "relaxed"] as const,
      defaults.lineHeight,
    ),
    spellCheck: bool(input.spellCheck, defaults.spellCheck),
    showToolbar: bool(input.showToolbar, defaults.showToolbar),
    toolbarMode: enumValue(
      input.toolbarMode,
      ["compact", "expanded"] as const,
      defaults.toolbarMode,
    ),
    workspaceZoom: finite(input.workspaceZoom, defaults.workspaceZoom, 50, 150),
    snapToGrid: bool(input.snapToGrid, defaults.snapToGrid),
    gridSize: Number(
      enumValue(
        String(input.gridSize),
        ["10", "20", "40"] as const,
        String(defaults.gridSize) as "20",
      ),
    ),
    reduceMotion: bool(input.reduceMotion, defaults.reduceMotion),
  };
}

export function parseWorkspaceBackup(textValue: string): WorkspaceState {
  if (new Blob([textValue]).size > MAX_BACKUP_BYTES)
    throw new Error("La copia supera el límite de 50 MB.");
  let payload: unknown;
  try {
    payload = JSON.parse(textValue) as unknown;
  } catch {
    throw new Error("El archivo no contiene una copia JSON válida.");
  }
  const root = objectValue(payload);
  if (root.format !== "lumina-workspace" || !root.state)
    throw new Error("El archivo no es una copia válida de Mi Diario.");
  const version = root.version ?? 1;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1)
    throw new Error("La copia tiene una versión inválida.");
  if (version > 2)
    throw new Error("Esta copia fue creada por una versión más reciente de Mi Diario.");
  return normalizeWorkspaceState(root.state);
}
