"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, ChevronDown, ChevronRight, FilePlus2, Folder, Heart, Home, MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { TextInputDialog } from "@/src/components/text-input-dialog";
import type { FolderNames, WorkspaceDocument, WorkspaceFolder } from "@/src/types/workspace";
import { localDateKey } from "@/src/core/workspace-rules";

interface SidebarProps {
  documents: WorkspaceDocument[];
  workspaceName: string;
  folderNames: FolderNames;
  activeId: string;
  activeView: "document" | "calendar" | "trash";
  collapsed: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDaily: () => void;
  onCalendar: () => void;
  onTrash: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onToggleFavorite: (id: string) => void;
  onRenameFolder: (folder: WorkspaceFolder, name: string) => void;
}

const folderOrder: WorkspaceFolder[] = ["Diario", "Universidad", "Proyectos", "Notas"];

export function Sidebar({ documents, workspaceName, folderNames, activeId, activeView, collapsed, onSelect, onAdd, onDaily, onCalendar, onTrash, onSearch, onSettings, onToggleFavorite, onRenameFolder }: SidebarProps) {
  const [closedFolders, setClosedFolders] = useState<WorkspaceFolder[]>([]);
  const [renameFolder, setRenameFolder] = useState<WorkspaceFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const live = documents.filter((doc) => !doc.trashed);
  const grouped = folderOrder.map((folder) => ({ folder, items: live.filter((doc) => doc.folder === folder) }));
  const beginRename = (folder: WorkspaceFolder) => {
    setRenameFolder(folder);
    setFolderName(folderNames[folder]);
    setFolderError("");
  };
  return <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`} aria-label="Navegación del espacio">
    <div className="brand-row"><div className="brand-mark">❧</div><div className="brand-copy"><strong>{workspaceName}</strong><span>Diario · notas · calendario</span></div><button className="icon-button quiet" aria-label="Preferencias del espacio" onClick={onSettings}><MoreHorizontal size={17} /></button></div>
    <button className="quick-search" onClick={onSearch}><Search size={16} /><span>Buscar en mi agenda</span><kbd>Ctrl K</kbd></button>
    <div className="primary-nav">
      <button className={activeView === "document" && documents.find((doc) => doc.id === activeId)?.journalDate === localDateKey(new Date()) ? "active" : ""} onClick={onDaily}><Home /><span>Hoy</span></button>
      <button className={activeView === "calendar" ? "active" : ""} onClick={onCalendar}><CalendarDays /><span>Calendario</span></button>
      <button onClick={() => { const latest = live.filter((doc) => doc.folder === "Diario").sort((a, b) => b.updatedAt - a.updatedAt)[0]; if (latest) onSelect(latest.id); else onDaily(); }}><BookOpen /><span>Diario</span></button>
    </div>
    <nav className="sidebar-scroll">
      {!!live.filter((doc) => doc.favorite).length && <><div className="section-heading"><span>Favoritos</span></div>{live.filter((doc) => doc.favorite).map((doc) => <DocumentRow key={`fav-${doc.id}`} doc={doc} active={activeView === "document" && doc.id === activeId} onSelect={onSelect} onFavorite={onToggleFavorite} />)}</>}
      <div className="section-heading"><span>Mi espacio</span><button aria-label="Nueva nota" onClick={onAdd}><Plus size={15} /></button></div>
      {grouped.map(({ folder, items }) => {
        const closed = closedFolders.includes(folder);
        return <div className="folder-group" key={folder}>
          <div className="folder-title">
            <button className="folder-toggle" aria-label={`${closed ? "Abrir" : "Cerrar"} ${folderNames[folder]}`} onClick={() => setClosedFolders((current) => current.includes(folder) ? current.filter((item) => item !== folder) : [...current, folder])}>{closed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
            <Folder size={15} /><span title={folderNames[folder]}>{folderNames[folder]}</span><small>{items.length}</small>
            <button className="folder-rename" aria-label={`Renombrar ${folderNames[folder]}`} title="Renombrar cuaderno" onClick={() => beginRename(folder)}><Pencil size={12} /></button>
          </div>
          {!closed && items.map((doc) => <DocumentRow key={doc.id} doc={doc} active={activeView === "document" && doc.id === activeId} onSelect={onSelect} onFavorite={onToggleFavorite} />)}
          {!closed && items.length === 0 && <p className="empty-folder">Cuaderno vacío</p>}
        </div>;
      })}
    </nav>
    <div className="sidebar-quote">“Tu historia importa.<br />Escríbela cada día.”</div>
    <div className="sidebar-bottom"><button className={activeView === "trash" ? "active" : ""} onClick={onTrash}><Trash2 /><span>Papelera</span></button><button onClick={onSettings}><Settings2 /><span>Preferencias</span></button><button className="new-note" onClick={onAdd}><FilePlus2 /><span>Nueva nota</span></button></div>
    <TextInputDialog open={Boolean(renameFolder)} title="Renombrar cuaderno" label="Nombre del cuaderno" value={folderName} maxLength={40} error={folderError} confirmLabel="Guardar nombre" onChange={(value) => { setFolderName(value); setFolderError(""); }} onCancel={() => setRenameFolder(null)} onConfirm={() => { const clean = folderName.trim(); if (!clean) { setFolderError("Escribe un nombre para el cuaderno."); return; } if (renameFolder) onRenameFolder(renameFolder, clean); setRenameFolder(null); }} />
  </aside>;
}

function DocumentRow({ doc, active, onSelect, onFavorite }: { doc: WorkspaceDocument; active: boolean; onSelect: (id: string) => void; onFavorite: (id: string) => void }) {
  return <div className={`document-row ${active ? "active" : ""}`}><button className="document-main" onClick={() => onSelect(doc.id)}><span className="doc-emoji">{doc.emoji}</span><span>{doc.title}</span></button><button className="row-action" aria-label={doc.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={() => onFavorite(doc.id)}><Heart size={13} fill={doc.favorite ? "currentColor" : "none"} /></button></div>;
}
