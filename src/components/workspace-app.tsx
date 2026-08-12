"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, Check, ChevronRight, Clock3, FileDown, Menu, MoreHorizontal, Plus, Search, Sparkles, X } from "lucide-react";
import { Sidebar } from "@/src/components/sidebar";
import { RichEditor } from "@/src/editor/rich-editor";
import { DrawingCanvas } from "@/src/drawing/drawing-canvas";
import { FlowchartEditor } from "@/src/flowchart/flowchart-editor";
import { ExportDialog } from "@/src/components/export-dialog";
import { CommandPalette, commandIcons, type CommandAction } from "@/src/components/command-palette";
import { SettingsDialog } from "@/src/components/settings-dialog";
import { VersionPanel } from "@/src/components/version-panel";
import { useWorkspace } from "@/src/hooks/use-workspace";

export function WorkspaceApp() {
  const workspace = useWorkspace();
  const { state, setState, ready, saveStatus, activeDocument, activeTab, patchDocument, updateActiveTab, addDocument, createDailyNote, addTab, deleteTab, saveVersion, restoreVersion } = workspace;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dialog, setDialog] = useState<"export" | "settings" | "commands" | "search" | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [tabMenu, setTabMenu] = useState(false);
  const [toast, setToast] = useState("");
  const exportTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); setDialog("commands"); }
      else if (mod && event.shiftKey && event.key.toLowerCase() === "e") { event.preventDefault(); setDialog("export"); }
      else if (mod && event.key.toLowerCase() === "k") { event.preventDefault(); setDialog("search"); }
      else if (mod && event.key.toLowerCase() === "s") { event.preventDefault(); saveVersion("Guardado manual"); setToast("Versión guardada"); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [saveVersion]);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => window.clearTimeout(timer); }, [toast]);

  const searchActions = useMemo<CommandAction[]>(() => state.documents.filter((doc) => !doc.trashed).map((doc) => ({ id: doc.id, label: doc.title, description: `${doc.folder} · ${doc.tags.map((tag) => `#${tag}`).join(" ")}`, icon: <span>{doc.emoji}</span>, action: () => setState((current) => ({ ...current, activeDocumentId: doc.id })) })), [state.documents, setState]);
  const commands = useMemo<CommandAction[]>(() => [
    { id: "new", label: "Nueva nota", description: "Crea un documento en Notas", icon: commandIcons.add, action: () => addDocument("Notas") },
    { id: "daily", label: "Abrir diario de hoy", description: "Crea o abre la entrada del día", icon: <BookMarked />, action: createDailyNote },
    { id: "draw", label: "Insertar lienzo", description: "Añade una pestaña de dibujo", icon: commandIcons.draw, action: () => addTab("drawing") },
    { id: "flow", label: "Crear diagrama", description: "Añade una pestaña de flujo ejecutable", icon: commandIcons.flow, action: () => addTab("flowchart") },
    { id: "export", label: "Exportar documento", description: "PDF, DOCX, Markdown y más", icon: commandIcons.export, action: () => setDialog("export") },
    { id: "settings", label: "Abrir preferencias", description: "Tema, color y copias de seguridad", icon: commandIcons.settings, action: () => setDialog("settings") },
    { id: "theme", label: state.theme === "light" ? "Activar tema oscuro" : "Activar tema claro", description: "Cambia la apariencia de Lúmina", icon: state.theme === "light" ? commandIcons.dark : commandIcons.light, action: () => setState((current) => ({ ...current, theme: current.theme === "light" ? "dark" : "light" })) },
  ], [addDocument, addTab, createDailyNote, setState, state.theme]);

  if (!ready || !activeDocument || !activeTab) return <div className="app-loading"><div className="brand-mark">L</div><p>Preparando tu espacio…</p></div>;
  const wordCount = activeTab.kind === "document" ? activeTab.content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length : 0;
  return <div className={`workspace-app theme-${state.theme} width-${state.documentWidth}`} style={{ "--accent": state.accent } as React.CSSProperties}>
    <Sidebar documents={state.documents} activeId={activeDocument.id} collapsed={sidebarCollapsed} onSelect={(id) => setState((current) => ({ ...current, activeDocumentId: id }))} onAdd={() => addDocument("Notas")} onDaily={createDailyNote} onSearch={() => setDialog("search")} onSettings={() => setDialog("settings")} onToggleFavorite={(id) => patchDocument(id, (doc) => ({ ...doc, favorite: !doc.favorite }))} />
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button menu-button" aria-label="Mostrar u ocultar barra lateral" onClick={() => setSidebarCollapsed((value) => !value)}><Menu size={19} /></button>
        <div className="breadcrumbs"><span>{activeDocument.folder}</span><ChevronRight size={14} /><strong>{activeDocument.title}</strong></div>
        <div className="topbar-actions"><button className="save-state" title="Guardado automático"><span className={saveStatus === "saving" ? "saving-dot" : "saved-dot"} />{saveStatus === "saving" ? "Guardando…" : saveStatus === "error" ? "Error al guardar" : "Guardado"}</button><button className="top-action" onClick={() => setDialog("search")}><Search size={17} /><span>Buscar</span></button><button className="top-action" onClick={() => setShowVersions((value) => !value)}><Clock3 size={17} /><span>Historial</span></button><button className="export-button" onClick={() => setDialog("export")}><FileDown size={17} /><span>Exportar</span></button><button className="avatar" onClick={() => setDialog("settings")}>JS</button></div>
      </header>
      <div className="document-heading">
        <button className="document-emoji" title="Cambiar icono">{activeDocument.emoji}</button>
        <input value={activeDocument.title} aria-label="Título del documento" onChange={(e) => patchDocument(activeDocument.id, (doc) => ({ ...doc, title: e.target.value, updatedAt: Date.now() }))} />
        <button className="icon-button quiet" aria-label="Más opciones"><MoreHorizontal /></button>
      </div>
      <div className="tag-line">{activeDocument.tags.map((tag) => <span key={tag}>#{tag}</span>)}<button onClick={() => { const tag = window.prompt("Nueva etiqueta"); if (tag) patchDocument(activeDocument.id, (doc) => ({ ...doc, tags: [...new Set([...doc.tags, tag.replace(/^#/, "")])] })); }}><Plus size={13} /> Etiqueta</button></div>
      <div className="tabs-bar"><div className="tabs-scroll">{activeDocument.tabs.map((tab) => <div key={tab.id} className={`tab ${tab.id === activeTab.id ? "active" : ""}`} style={{ "--tab-color": tab.color } as React.CSSProperties}><button onClick={() => patchDocument(activeDocument.id, (doc) => ({ ...doc, activeTabId: tab.id }))}><span>{tab.icon}</span>{tab.title}</button>{activeDocument.tabs.length > 1 && tab.id === activeTab.id && <button className="tab-close" aria-label="Cerrar pestaña" onClick={() => deleteTab(tab.id)}><X size={12} /></button>}</div>)}</div><div className="tab-add-wrap"><button className="tab-add" onClick={() => setTabMenu((value) => !value)}><Plus size={15} /> Añadir</button>{tabMenu && <div className="tab-menu"><button onClick={() => { addTab("document"); setTabMenu(false); }}>✎ Documento</button><button onClick={() => { addTab("drawing"); setTabMenu(false); }}>⌁ Lienzo de dibujo</button><button onClick={() => { addTab("flowchart"); setTabMenu(false); }}>◇ Diagrama de flujo</button></div>}</div></div>
      <div className="content-area" ref={exportTarget}>
        {activeTab.kind === "document" && <RichEditor key={activeTab.id} content={activeTab.content} onChange={(content) => updateActiveTab({ content })} />}
        {activeTab.kind === "drawing" && <DrawingCanvas key={activeTab.id} data={activeTab.drawingData} onChange={(drawingData) => updateActiveTab({ drawingData })} />}
        {activeTab.kind === "flowchart" && <FlowchartEditor key={activeTab.id} nodes={activeTab.flowNodes ?? []} connections={activeTab.flowConnections ?? []} onChange={(flowNodes, flowConnections) => updateActiveTab({ flowNodes, flowConnections })} />}
      </div>
      <footer className="statusbar"><div><span>{activeTab.kind === "document" ? `${wordCount} palabras` : activeTab.kind === "drawing" ? "Lienzo 1200 × 760" : `${activeTab.flowNodes?.length ?? 0} nodos`}</span><span>Última edición {formatRelative(activeDocument.updatedAt)}</span></div><div><span>{activeTab.kind === "document" ? "Documento infinito" : activeTab.kind === "drawing" ? "Dibujo" : "Simulación"}</span><button onClick={() => setDialog("commands")}><Sparkles size={14} /> Comandos</button></div></footer>
    </main>
    {showVersions && <VersionPanel versions={activeDocument.versions} onSave={() => { saveVersion(); setToast("Versión guardada"); }} onRestore={restoreVersion} onClose={() => setShowVersions(false)} />}
    {dialog === "export" && <ExportDialog doc={activeDocument} state={state} targetRef={exportTarget} onClose={() => setDialog(null)} />}
    {dialog === "settings" && <SettingsDialog state={state} onChange={setState} onRestore={setState} onClose={() => setDialog(null)} />}
    <CommandPalette open={dialog === "commands" || dialog === "search"} mode={dialog === "search" ? "search" : "commands"} actions={dialog === "search" ? searchActions : commands} onClose={() => setDialog(null)} />
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>;
}

function formatRelative(time: number) { const minutes = Math.max(0, Math.round((Date.now() - time) / 60000)); if (minutes < 1) return "ahora"; if (minutes < 60) return `hace ${minutes} min`; return new Intl.DateTimeFormat("es-PA", { hour: "numeric", minute: "2-digit" }).format(time); }
