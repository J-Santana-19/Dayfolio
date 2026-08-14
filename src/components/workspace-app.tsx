"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookMarked,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  FileDown,
  Focus,
  Heart,
  Maximize2,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Sidebar } from "@/src/components/sidebar";
import { RichEditor } from "@/src/editor/rich-editor";
import { DrawingCanvas } from "@/src/drawing/drawing-canvas";
import { FlowchartEditor } from "@/src/flowchart/flowchart-editor";
import { ExportDialog } from "@/src/components/export-dialog";
import {
  CommandPalette,
  commandIcons,
  type CommandAction,
} from "@/src/components/command-palette";
import { SettingsDialog } from "@/src/components/settings-dialog";
import { VersionPanel } from "@/src/components/version-panel";
import { CalendarView } from "@/src/components/calendar-view";
import { TrashView } from "@/src/components/trash-view";
import {
  createDocument,
  createInitialState,
  uid,
} from "@/src/database/initial-data";
import { useWorkspace } from "@/src/hooks/use-workspace";
import type { WorkspaceDocument } from "@/src/types/workspace";

type MainView = "document" | "calendar" | "trash";

export function WorkspaceApp() {
  const workspace = useWorkspace();
  const {
    state,
    setState,
    ready,
    saveStatus,
    retrySave,
    activeDocument,
    activeTab,
    patchDocument,
    updateActiveTab,
    addDocument,
    createDailyNote,
    createDailyNoteForDate,
    addTab,
    deleteTab,
    saveVersion,
    restoreVersion,
  } = workspace;
  const [view, setView] = useState<MainView>("document");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dialog, setDialog] = useState<
    "export" | "settings" | "commands" | "search" | null
  >(null);
  const [showVersions, setShowVersions] = useState(false);
  const [tabMenu, setTabMenu] = useState(false);
  const [docMenu, setDocMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const exportTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 760px)").matches) setSidebarCollapsed(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const closeMobileSidebar = () => {
    if (window.matchMedia("(max-width: 760px)").matches) setSidebarCollapsed(true);
  };

  const openDocument = (id: string) => {
    setState((current) => ({ ...current, activeDocumentId: id }));
    setView("document");
    setShowVersions(false);
    closeMobileSidebar();
  };
  const openToday = () => {
    createDailyNote();
    setView("document");
    closeMobileSidebar();
  };
  const newNote = () => {
    addDocument("Notas");
    setView("document");
    closeMobileSidebar();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === "Escape") {
        setDialog(null);
        setTabMenu(false);
        setDocMenu(false);
        setFocusMode(false);
      } else if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setDialog("commands");
      } else if (
        mod &&
        event.shiftKey &&
        event.key.toLowerCase() === "e" &&
        view === "document"
      ) {
        event.preventDefault();
        setDialog("export");
      } else if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDialog("search");
      } else if (
        mod &&
        event.key.toLowerCase() === "s" &&
        view === "document"
      ) {
        event.preventDefault();
        saveVersion("Guardado manual");
        setToast("Versión guardada");
      } else if (mod && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFocusMode((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveVersion, view]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const searchActions: CommandAction[] = state.documents
    .filter((doc) => !doc.trashed)
    .map((doc) => ({
      id: doc.id,
      label: doc.title,
      description: `${doc.folder} · ${doc.tags.map((tag) => `#${tag}`).join(" ")}`,
      searchText: doc.tabs
        .map((tab) => tab.content.replace(/<[^>]*>/g, " "))
        .join(" ")
        .slice(0, 20_000),
      icon: <span>{doc.emoji}</span>,
      action: () => openDocument(doc.id),
    }));
  const commands: CommandAction[] = [
    {
      id: "new",
      label: "Nueva nota",
      description: "Crea un documento en Notas",
      icon: commandIcons.add,
      action: newNote,
    },
    {
      id: "daily",
      label: "Abrir diario de hoy",
      description: "Crea o abre la entrada del día",
      icon: <BookMarked />,
      action: openToday,
    },
    {
      id: "calendar",
      label: "Abrir calendario",
      description: "Explora tus entradas por fecha",
      icon: <CalendarDays />,
      action: () => setView("calendar"),
    },
    {
      id: "draw",
      label: "Insertar lienzo",
      description: "Añade una pestaña de dibujo",
      icon: commandIcons.draw,
      action: () => {
        addTab("drawing");
        setView("document");
      },
    },
    {
      id: "flow",
      label: "Crear diagrama",
      description: "Añade una pestaña de flujo ejecutable",
      icon: commandIcons.flow,
      action: () => {
        addTab("flowchart");
        setView("document");
      },
    },
    {
      id: "export",
      label: "Exportar documento",
      description: "PDF, DOCX, Markdown y más",
      icon: commandIcons.export,
      action: () => {
        setView("document");
        setDialog("export");
      },
    },
    {
      id: "settings",
      label: "Abrir preferencias",
      description: "Apariencia, editor, privacidad y copias",
      icon: commandIcons.settings,
      action: () => setDialog("settings"),
    },
    {
      id: "theme",
      label:
        state.theme === "light" ? "Activar noche tinta" : "Activar papel crema",
      description: "Cambia la atmósfera de Lúmina",
      icon: state.theme === "light" ? commandIcons.dark : commandIcons.light,
      action: () =>
        setState((current) => ({
          ...current,
          theme: current.theme === "light" ? "dark" : "light",
        })),
    },
  ];

  if (!ready || !activeDocument || !activeTab)
    return (
      <div className="app-loading">
        <div className="brand-mark">❧</div>
        <p>Abriendo tu agenda…</p>
      </div>
    );
  const wordCount =
    activeTab.kind === "document"
      ? activeTab.content
          .replace(/<[^>]*>/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      : 0;
  const style = { "--accent": state.accent } as React.CSSProperties;
  const appClasses = `workspace-app theme-${state.theme} width-${state.documentWidth} editor-font-${state.editorFont} font-size-${state.fontSize} line-height-${state.lineHeight} ${state.reduceMotion ? "reduce-motion" : ""} ${focusMode ? "focus-mode" : ""}`;
  const setZoom = (value: number) =>
    setState((current) => ({
      ...current,
      workspaceZoom: Math.max(50, Math.min(150, value)),
    }));

  const duplicateDocument = () => {
    const copy: WorkspaceDocument = structuredClone(activeDocument);
    copy.id = uid("doc");
    copy.title = `${activeDocument.title} — copia`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    copy.favorite = false;
    copy.trashed = false;
    copy.versions = [];
    const activeIndex = copy.tabs.findIndex(
      (tab) => tab.id === copy.activeTabId,
    );
    copy.tabs = copy.tabs.map((tab) => ({ ...tab, id: uid("tab") }));
    copy.activeTabId = copy.tabs[activeIndex]?.id ?? copy.tabs[0].id;
    setState((current) => ({
      ...current,
      documents: [...current.documents, copy],
      activeDocumentId: copy.id,
    }));
    setDocMenu(false);
    setToast("Documento duplicado");
  };

  const moveToTrash = () => {
    setState((current) => {
      let documents = current.documents.map((doc) =>
        doc.id === activeDocument.id
          ? { ...doc, trashed: true, updatedAt: Date.now() }
          : doc,
      );
      let next = documents.find((doc) => !doc.trashed);
      if (!next) {
        next = createDocument();
        documents = [...documents, next];
      }
      return { ...current, documents, activeDocumentId: next.id };
    });
    setDocMenu(false);
    setToast("Documento enviado a la papelera");
  };

  return (
    <div className={appClasses} style={style}>
      <Sidebar
        documents={state.documents}
        activeId={activeDocument.id}
        activeView={view}
        collapsed={sidebarCollapsed}
        onSelect={openDocument}
        onAdd={newNote}
        onDaily={openToday}
        onCalendar={() => {
          setView("calendar");
          setShowVersions(false);
          closeMobileSidebar();
        }}
        onTrash={() => {
          setView("trash");
          setShowVersions(false);
          closeMobileSidebar();
        }}
        onSearch={() => { setDialog("search"); closeMobileSidebar(); }}
        onSettings={() => { setDialog("settings"); closeMobileSidebar(); }}
        onToggleFavorite={(id) =>
          patchDocument(id, (doc) => ({ ...doc, favorite: !doc.favorite, updatedAt: Date.now() }))
        }
      />
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="Mostrar u ocultar barra lateral"
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            <Menu />
          </button>
          <div className="breadcrumbs">
            <span>
              {view === "calendar"
                ? "Mi agenda"
                : view === "trash"
                  ? "Organización"
                  : activeDocument.folder}
            </span>
            <ChevronRight />
            <strong>
              {view === "calendar"
                ? "Calendario"
                : view === "trash"
                  ? "Papelera"
                  : activeDocument.title}
            </strong>
          </div>
          <div className="topbar-actions">
            <button
              className="save-state"
              aria-live="polite"
              title={
                saveStatus === "error"
                  ? "Reintentar guardado"
                  : "Guardado automático"
              }
              onClick={() => {
                if (saveStatus === "error") retrySave();
              }}
            >
              <span
                className={
                  saveStatus === "saving"
                    ? "saving-dot"
                    : saveStatus === "error"
                      ? "error-dot"
                      : "saved-dot"
                }
              />
              {saveStatus === "saving"
                ? "Guardando…"
                : saveStatus === "error"
                  ? "Reintentar guardado"
                  : "Todo guardado"}
            </button>
            <button className="top-action" onClick={() => setDialog("search")}>
              <Search />
              <span>Buscar</span>
            </button>
            {view === "document" && (
              <>
                <button
                  className="top-action"
                  onClick={() => setShowVersions((value) => !value)}
                >
                  <Clock3 />
                  <span>Historial</span>
                </button>
                <button
                  className="export-button"
                  onClick={() => setDialog("export")}
                >
                  <FileDown />
                  <span>Exportar</span>
                </button>
              </>
            )}
            <button
              className="avatar"
              aria-label="Abrir preferencias"
              onClick={() => setDialog("settings")}
            >
              JS
            </button>
          </div>
        </header>

        {view === "calendar" ? (
          <CalendarView
            documents={state.documents}
            onOpenDate={(key) => {
              createDailyNoteForDate(key);
              setView("document");
            }}
          />
        ) : view === "trash" ? (
          <TrashView
            documents={state.documents}
            onRestore={(id) => {
              patchDocument(id, (doc) => ({
                ...doc,
                trashed: false,
                updatedAt: Date.now(),
              }));
              setToast("Documento restaurado");
            }}
            onDelete={(id) => {
              if (window.confirm("¿Eliminar definitivamente este documento?"))
                setState((current) => {
                  let documents = current.documents.filter(
                    (doc) => doc.id !== id,
                  );
                  let activeDocumentId = current.activeDocumentId;
                  const live = documents.find((doc) => !doc.trashed);
                  if (!live) {
                    const replacement = createDocument();
                    documents = [...documents, replacement];
                    activeDocumentId = replacement.id;
                  } else if (
                    !documents.some(
                      (doc) => doc.id === activeDocumentId && !doc.trashed,
                    )
                  )
                    activeDocumentId = live.id;
                  return { ...current, documents, activeDocumentId };
                });
            }}
          />
        ) : (
          <>
            <div className="document-heading">
              <button
                className="document-emoji"
                title="Cambiar icono"
                onClick={() => {
                  const emoji = window.prompt(
                    "Escribe un emoji o símbolo",
                    activeDocument.emoji,
                  );
                  if (emoji?.trim())
                    patchDocument(activeDocument.id, (doc) => ({
                      ...doc,
                      emoji: emoji.trim().slice(0, 3),
                      updatedAt: Date.now(),
                    }));
                }}
              >
                {activeDocument.emoji}
              </button>
              <div className="title-stack">
                <span>
                  {activeDocument.journalDate
                    ? new Intl.DateTimeFormat("es-PA", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }).format(
                        new Date(`${activeDocument.journalDate}T12:00:00`),
                      )
                    : activeDocument.folder}
                </span>
                <input
                  maxLength={240}
                  value={activeDocument.title}
                  aria-label="Título del documento"
                  onChange={(event) =>
                    patchDocument(activeDocument.id, (doc) => ({
                      ...doc,
                      title: event.target.value,
                      updatedAt: Date.now(),
                    }))
                  }
                />
              </div>
              <div className="doc-menu-wrap">
                <button
                  className="icon-button quiet"
                  aria-label="Opciones del documento"
                  onClick={() => setDocMenu((value) => !value)}
                >
                  <MoreHorizontal />
                </button>
                {docMenu && (
                  <div className="document-menu">
                    <button
                      onClick={() => {
                        patchDocument(activeDocument.id, (doc) => ({
                          ...doc,
                          favorite: !doc.favorite,
                          updatedAt: Date.now(),
                        }));
                        setDocMenu(false);
                      }}
                    >
                      <Heart />{" "}
                      {activeDocument.favorite
                        ? "Quitar de favoritos"
                        : "Añadir a favoritos"}
                    </button>
                    <button onClick={duplicateDocument}>
                      <Copy /> Duplicar documento
                    </button>
                    <button
                      onClick={() => {
                        setDialog("settings");
                        setDocMenu(false);
                      }}
                    >
                      <Settings2 /> Preferencias
                    </button>
                    <button className="danger" onClick={moveToTrash}>
                      <Trash2 /> Mover a papelera
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="tag-line">
              {activeDocument.tags.map((tag) => (
                <button
                  key={tag}
                  title="Eliminar etiqueta"
                  onClick={() =>
                    patchDocument(activeDocument.id, (doc) => ({
                      ...doc,
                      tags: doc.tags.filter((item) => item !== tag),
                      updatedAt: Date.now(),
                    }))
                  }
                >
                  #{tag}
                </button>
              ))}
              <button
                onClick={() => {
                  const tag = window
                    .prompt("Nueva etiqueta")
                    ?.replace(/^#/, "")
                    .trim()
                    .slice(0, 40);
                  if (tag)
                    patchDocument(activeDocument.id, (doc) => ({
                      ...doc,
                      tags: doc.tags.some(
                        (item) => item.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es"),
                      ) ? doc.tags : [...doc.tags, tag].slice(0, 20),
                      updatedAt: Date.now(),
                    }));
                }}
              >
                <Plus /> Etiqueta
              </button>
            </div>
            <div className="tabs-bar">
              <div className="tabs-scroll">
                {activeDocument.tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`tab ${tab.id === activeTab.id ? "active" : ""}`}
                    style={{ "--tab-color": tab.color } as React.CSSProperties}
                  >
                    <button
                      onClick={() =>
                        patchDocument(activeDocument.id, (doc) => ({
                          ...doc,
                          activeTabId: tab.id,
                        }))
                      }
                    >
                      <span>{tab.icon}</span>
                      {tab.title}
                    </button>
                    {activeDocument.tabs.length > 1 &&
                      tab.id === activeTab.id && (
                        <button
                          className="tab-close"
                          aria-label="Cerrar pestaña"
                          onClick={() => deleteTab(tab.id)}
                        >
                          <X />
                        </button>
                      )}
                  </div>
                ))}
              </div>
              <div className="tab-add-wrap">
                <button
                  className="tab-add"
                  onClick={() => setTabMenu((value) => !value)}
                >
                  <Plus /> Añadir
                </button>
                {tabMenu && (
                  <div className="tab-menu">
                    <button
                      onClick={() => {
                        addTab("document");
                        setTabMenu(false);
                      }}
                    >
                      ✎ Página escrita
                    </button>
                    <button
                      onClick={() => {
                        addTab("drawing");
                        setTabMenu(false);
                      }}
                    >
                      ⌁ Lienzo de dibujo
                    </button>
                    <button
                      onClick={() => {
                        addTab("flowchart");
                        setTabMenu(false);
                      }}
                    >
                      ◇ Diagrama de flujo
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="content-area" ref={exportTarget}>
              {activeTab.kind === "document" && (
                <RichEditor
                  key={activeTab.id}
                  content={activeTab.content}
                  spellCheck={state.spellCheck}
                  showToolbar={state.showToolbar}
                  toolbarMode={state.toolbarMode}
                  onToolbarModeChange={(toolbarMode) =>
                    setState((current) => ({ ...current, toolbarMode }))
                  }
                  zoom={state.workspaceZoom}
                  onChange={(content) => updateActiveTab({ content })}
                />
              )}
              {activeTab.kind === "drawing" && (
                <DrawingCanvas
                  key={activeTab.id}
                  data={activeTab.drawingData}
                  onChange={(drawingData) => updateActiveTab({ drawingData })}
                />
              )}
              {activeTab.kind === "flowchart" && (
                <FlowchartEditor
                  key={activeTab.id}
                  nodes={activeTab.flowNodes ?? []}
                  connections={activeTab.flowConnections ?? []}
                  snapToGrid={state.snapToGrid}
                  gridSize={state.gridSize}
                  zoom={state.workspaceZoom}
                  onChange={(flowNodes, flowConnections) =>
                    updateActiveTab({ flowNodes, flowConnections })
                  }
                />
              )}
            </div>
            <footer className="statusbar">
              <div>
                <span>
                  {activeTab.kind === "document"
                    ? `${wordCount} palabras · ${activeTab.content.replace(/<[^>]*>/g, "").length} caracteres`
                    : activeTab.kind === "drawing"
                      ? "Lienzo 1200 × 760"
                      : `${activeTab.flowNodes?.length ?? 0} nodos · ${activeTab.flowConnections?.length ?? 0} conexiones`}
                </span>
                <span>
                  Última edición {formatRelative(activeDocument.updatedAt)}
                </span>
              </div>
              <div className="workspace-controls">
                <button
                  title="Alejar"
                  onClick={() => setZoom(state.workspaceZoom - 25)}
                >
                  <ZoomOut />
                </button>
                <select
                  aria-label="Zoom del espacio"
                  value={state.workspaceZoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                >
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                </select>
                <button
                  title="Acercar"
                  onClick={() => setZoom(state.workspaceZoom + 25)}
                >
                  <ZoomIn />
                </button>
                <button
                  title="Modo concentración (Ctrl+Shift+F)"
                  className={focusMode ? "active" : ""}
                  onClick={() => setFocusMode((value) => !value)}
                >
                  <Focus />
                </button>
                <button
                  title="Pantalla completa"
                  onClick={() => {
                    const operation = document.fullscreenElement
                      ? document.exitFullscreen()
                      : document.documentElement.requestFullscreen();
                    operation.catch(() => setToast("El navegador no permitió la pantalla completa"));
                  }}
                >
                  <Maximize2 />
                </button>
                <button onClick={() => setDialog("commands")}>
                  <Sparkles /> Comandos
                </button>
              </div>
            </footer>
          </>
        )}
      </main>
      {showVersions && view === "document" && (
        <VersionPanel
          versions={activeDocument.versions}
          onSave={() => {
            saveVersion();
            setToast("Versión guardada");
          }}
          onRestore={restoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}
      {dialog === "export" && (
        <ExportDialog
          doc={activeDocument}
          state={state}
          targetRef={exportTarget}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "settings" && (
        <SettingsDialog
          state={state}
          onChange={setState}
          onRestore={setState}
          onReset={() => setState(createInitialState())}
          onClose={() => setDialog(null)}
        />
      )}
      <CommandPalette
        key={dialog ?? "closed"}
        open={dialog === "commands" || dialog === "search"}
        mode={dialog === "search" ? "search" : "commands"}
        actions={dialog === "search" ? searchActions : commands}
        onClose={() => setDialog(null)}
      />
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check />
          {toast}
        </div>
      )}
    </div>
  );
}

function formatRelative(time: number) {
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  return new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(time);
}
