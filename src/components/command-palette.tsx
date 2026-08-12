/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
"use client";

import { FileDown, FilePlus2, Moon, Paintbrush, Search, Settings2, Shapes, Sun, Table2, X } from "lucide-react";
import { useState } from "react";

export interface CommandAction { id: string; label: string; description: string; icon: React.ReactNode; action: () => void; }

export function CommandPalette({ open, mode, actions, onClose }: { open: boolean; mode: "commands" | "search"; actions: CommandAction[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  if (!open) return null;
  const filtered = actions.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  return <dialog open className="modal-backdrop command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="command-palette"><div className="command-input"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "search" ? "Buscar documentos, etiquetas y contenido…" : "Escribe un comando…"} /><button onClick={onClose}><X size={17} /></button></div><div className="command-results">{filtered.length ? filtered.map((item) => <button key={item.id} onClick={() => { item.action(); onClose(); }}><span className="command-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span><kbd>↵</kbd></button>) : <div className="empty-results">No encontramos coincidencias para “{query}”.</div>}</div><div className="command-footer"><span>↑↓ Navegar</span><span>↵ Abrir</span><span>Esc Cerrar</span></div></div></dialog>;
}

export const commandIcons = { add: <FilePlus2 />, export: <FileDown />, table: <Table2 />, draw: <Paintbrush />, flow: <Shapes />, settings: <Settings2 />, light: <Sun />, dark: <Moon /> };
