import type { DocumentTab, WorkspaceDocument, WorkspaceState } from "@/src/types/workspace";

export const uid = (prefix: string) => {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${randomId}`;
};

export function createDocument(title = "Nota sin título", folder = "Notas"): WorkspaceDocument {
  const now = Date.now();
  const tabId = uid("tab");
  return {
    id: uid("doc"),
    title,
    emoji: "✦",
    folder,
    tags: [],
    favorite: false,
    trashed: false,
    createdAt: now,
    updatedAt: now,
    activeTabId: tabId,
    tabs: [{ id: tabId, title: "General", icon: "✎", color: "#5676e8", kind: "document", content: "<h1>Empieza a escribir</h1><p>Captura una idea, pega una imagen o escribe <strong>/</strong> para insertar un bloque.</p>" }],
    versions: [],
  };
}

export function createTab(kind: DocumentTab["kind"] = "document", title?: string): DocumentTab {
  const defaults = {
    document: { title: "Nueva pestaña", icon: "✎", color: "#5676e8" },
    drawing: { title: "Lienzo", icon: "⌁", color: "#e06c47" },
    flowchart: { title: "Diagrama", icon: "◇", color: "#21a17a" },
  }[kind];
  return { id: uid("tab"), title: title ?? defaults.title, icon: defaults.icon, color: defaults.color, kind, content: "" };
}

export function createInitialState(): WorkspaceState {
  const today = new Intl.DateTimeFormat("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const journal = createDocument(today.charAt(0).toUpperCase() + today.slice(1), "Diario");
  journal.emoji = "☀";
  journal.journalDate = localDateKey(new Date());
  journal.tags = ["diario", "agosto"];
  journal.tabs[0].content = `<p class="eyebrow">DIARIO · HOY</p><h1>${journal.title}</h1><p class="lead">Un lugar tranquilo para registrar el día.</p><h2>¿Qué hice hoy?</h2><p>Comienza aquí…</p><h2>¿Qué aprendí?</h2><p>Escribe un aprendizaje o una idea que quieras conservar.</p><blockquote>La claridad llega cuando las ideas encuentran su lugar.</blockquote>`;

  const project = createDocument("Sistema de reservas", "Proyectos");
  project.emoji = "◈";
  project.tags = ["proyecto", "frontend"];
  project.favorite = true;
  project.tabs[0].content = "<p class=\"eyebrow\">PROYECTO ACTIVO</p><h1>Sistema de reservas</h1><p class=\"lead\">Notas de producto, decisiones técnicas y próximos pasos en un solo lugar.</p><h2>Objetivo</h2><p>Crear una experiencia de reserva rápida, clara y accesible.</p><ul><li>Mapa del flujo principal</li><li>Validación de horarios</li><li>Confirmación por correo</li></ul><h2>Próximos pasos</h2><p>Revisar el modelo de datos y preparar el prototipo.</p>";
  const flow = createTab("flowchart", "Flujo de edad");
  flow.flowNodes = [
    { id: "start", type: "start", label: "Inicio", x: 310, y: 36 },
    { id: "input", type: "input", label: "Solicitar edad", x: 290, y: 132 },
    { id: "decision", type: "decision", label: "¿Edad ≥ 18?", x: 292, y: 236 },
    { id: "adult", type: "output", label: "Mayor de edad", x: 120, y: 354 },
    { id: "minor", type: "output", label: "Menor de edad", x: 470, y: 354 },
    { id: "end", type: "end", label: "Fin", x: 310, y: 466 },
  ];
  flow.flowConnections = [
    { id: "c1", from: "start", to: "input" }, { id: "c2", from: "input", to: "decision" },
    { id: "c3", from: "decision", to: "adult", label: "Sí" }, { id: "c4", from: "decision", to: "minor", label: "No" },
    { id: "c5", from: "adult", to: "end" }, { id: "c6", from: "minor", to: "end" },
  ];
  project.tabs.push(flow, createTab("drawing", "Bocetos"));

  const networks = createDocument("Fundamentos de redes", "Universidad");
  networks.emoji = "⌘";
  networks.tags = ["universidad", "redes"];
  networks.tabs[0].content = "<p class=\"eyebrow\">UNIVERSIDAD · REDES</p><h1>Fundamentos de redes</h1><p class=\"lead\">Resumen visual de conceptos y comandos esenciales.</p><h2>Modelo TCP/IP</h2><table><thead><tr><th>Capa</th><th>Ejemplos</th></tr></thead><tbody><tr><td>Aplicación</td><td>HTTP, DNS, SSH</td></tr><tr><td>Transporte</td><td>TCP, UDP</td></tr><tr><td>Internet</td><td>IP, ICMP</td></tr></tbody></table><pre><code>ping 8.8.8.8\nipconfig /all</code></pre>";

  return {
    workspaceName: "Mi agenda",
    documents: [journal, project, networks],
    activeDocumentId: journal.id,
    theme: "light",
    accent: "#6f7f5a",
    documentWidth: "comfortable",
    editorFont: "serif",
    fontSize: "medium",
    lineHeight: "comfortable",
    spellCheck: true,
    showToolbar: true,
    toolbarMode: "compact",
    workspaceZoom: 100,
    snapToGrid: true,
    gridSize: 20,
    reduceMotion: false,
  };
}

function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
