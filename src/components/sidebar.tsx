"use client";

import { CalendarDays, ChevronDown, FilePlus2, Folder, Heart, MoreHorizontal, Plus, Search, Settings2, Trash2 } from "lucide-react";
import type { WorkspaceDocument } from "@/src/types/workspace";

interface SidebarProps {
  documents: WorkspaceDocument[];
  activeId: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDaily: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onToggleFavorite: (id: string) => void;
}

const folderOrder = ["Diario", "Universidad", "Proyectos", "Notas"];

export function Sidebar({ documents, activeId, collapsed, onSelect, onAdd, onDaily, onSearch, onSettings, onToggleFavorite }: SidebarProps) {
  const live = documents.filter((doc) => !doc.trashed);
  const grouped = folderOrder.map((folder) => ({ folder, items: live.filter((doc) => doc.folder === folder) })).filter((group) => group.items.length);
  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`} aria-label="Navegación del espacio">
      <div className="brand-row">
        <div className="brand-mark">L</div>
        <div className="brand-copy"><strong>Lúmina</strong><span>Espacio personal</span></div>
        <button className="icon-button quiet" aria-label="Opciones del espacio"><MoreHorizontal size={17} /></button>
      </div>

      <button className="quick-search" onClick={onSearch}><Search size={16} /><span>Buscar en tu espacio</span><kbd>⌘ K</kbd></button>
      <button className="today-button" onClick={onDaily}><CalendarDays size={17} /><span>Diario de hoy</span><em>HOY</em></button>

      <nav className="sidebar-scroll">
        <div className="section-heading"><span>Favoritos</span></div>
        {live.filter((doc) => doc.favorite).map((doc) => <DocumentRow key={doc.id} doc={doc} active={doc.id === activeId} onSelect={onSelect} onFavorite={onToggleFavorite} />)}

        <div className="section-heading"><span>Espacio</span><button aria-label="Nueva nota" onClick={onAdd}><Plus size={15} /></button></div>
        {grouped.map(({ folder, items }) => (
          <div className="folder-group" key={folder}>
            <div className="folder-title"><ChevronDown size={14} /><Folder size={15} /><span>{folder}</span><small>{items.length}</small></div>
            {items.map((doc) => <DocumentRow key={doc.id} doc={doc} active={doc.id === activeId} onSelect={onSelect} onFavorite={onToggleFavorite} />)}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button><Trash2 size={16} /><span>Papelera</span></button>
        <button onClick={onSettings}><Settings2 size={16} /><span>Preferencias</span></button>
        <button className="new-note" onClick={onAdd}><FilePlus2 size={17} /><span>Nueva nota</span></button>
      </div>
    </aside>
  );
}

function DocumentRow({ doc, active, onSelect, onFavorite }: { doc: WorkspaceDocument; active: boolean; onSelect: (id: string) => void; onFavorite: (id: string) => void }) {
  return (
    <div className={`document-row ${active ? "active" : ""}`}>
      <button className="document-main" onClick={() => onSelect(doc.id)}><span className="doc-emoji">{doc.emoji}</span><span>{doc.title}</span></button>
      <button className="row-action" aria-label={doc.favorite ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={() => onFavorite(doc.id)}><Heart size={13} fill={doc.favorite ? "currentColor" : "none"} /></button>
    </div>
  );
}
