"use client";

import { BookOpen, CalendarDays, ChevronDown, FilePlus2, Folder, Heart, Home, MoreHorizontal, Plus, Search, Settings2, Trash2 } from "lucide-react";
import type { WorkspaceDocument } from "@/src/types/workspace";

interface SidebarProps {
  documents: WorkspaceDocument[];
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
}

const folderOrder = ["Diario", "Universidad", "Proyectos", "Notas"];

export function Sidebar({ documents, activeId, activeView, collapsed, onSelect, onAdd, onDaily, onCalendar, onTrash, onSearch, onSettings, onToggleFavorite }: SidebarProps) {
  const live = documents.filter((doc) => !doc.trashed);
  const grouped = folderOrder.map((folder) => ({ folder, items: live.filter((doc) => doc.folder === folder) })).filter((group) => group.items.length);
  return <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`} aria-label="Navegación del espacio">
    <div className="brand-row"><div className="brand-mark">L</div><div className="brand-copy"><strong>Lúmina</strong><span>Mi diario clásico</span></div><button className="icon-button quiet" aria-label="Preferencias del espacio" onClick={onSettings}><MoreHorizontal size={17} /></button></div>
    <button className="quick-search" onClick={onSearch}><Search size={16} /><span>Buscar en mi agenda</span><kbd>Ctrl K</kbd></button>
    <div className="primary-nav">
      <button className={activeView === "document" && documents.find((doc) => doc.id === activeId)?.journalDate === localDateKey(new Date()) ? "active" : ""} onClick={onDaily}><Home /><span>Hoy</span></button>
      <button className={activeView === "calendar" ? "active" : ""} onClick={onCalendar}><CalendarDays /><span>Calendario</span></button>
      <button onClick={() => { const latest = live.filter((doc) => doc.folder === "Diario").sort((a, b) => b.updatedAt - a.updatedAt)[0]; if (latest) onSelect(latest.id); else onDaily(); }}><BookOpen /><span>Diario</span></button>
    </div>
    <nav className="sidebar-scroll">
      {!!live.filter((doc) => doc.favorite).length && <><div className="section-heading"><span>Favoritos</span></div>{live.filter((doc) => doc.favorite).map((doc) => <DocumentRow key={`fav-${doc.id}`} doc={doc} active={activeView === "document" && doc.id === activeId} onSelect={onSelect} onFavorite={onToggleFavorite} />)}</>}
      <div className="section-heading"><span>Mi espacio</span><button aria-label="Nueva nota" onClick={onAdd}><Plus size={15} /></button></div>
      {grouped.map(({ folder, items }) => <div className="folder-group" key={folder}><div className="folder-title"><ChevronDown size={14} /><Folder size={15} /><span>{folder}</span><small>{items.length}</small></div>{items.map((doc) => <DocumentRow key={doc.id} doc={doc} active={activeView === "document" && doc.id === activeId} onSelect={onSelect} onFavorite={onToggleFavorite} />)}</div>)}
    </nav>
    <div className="sidebar-quote">“Tu historia importa.<br />Escríbela cada día.”</div>
    <div className="sidebar-bottom"><button className={activeView === "trash" ? "active" : ""} onClick={onTrash}><Trash2 /><span>Papelera</span></button><button onClick={onSettings}><Settings2 /><span>Preferencias</span></button><button className="new-note" onClick={onAdd}><FilePlus2 /><span>Nueva nota</span></button></div>
  </aside>;
}

function DocumentRow({ doc, active, onSelect, onFavorite }: { doc: WorkspaceDocument; active: boolean; onSelect: (id: string) => void; onFavorite: (id: string) => void }) {
  return <div className={`document-row ${active ? "active" : ""}`}><button className="document-main" onClick={() => onSelect(doc.id)}><span className="doc-emoji">{doc.emoji}</span><span>{doc.title}</span></button><button className="row-action" aria-label={doc.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={() => onFavorite(doc.id)}><Heart size={13} fill={doc.favorite ? "currentColor" : "none"} /></button></div>;
}

function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
