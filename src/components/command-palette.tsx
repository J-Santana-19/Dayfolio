/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
"use client";

import {
  FileDown,
  FilePlus2,
  Moon,
  Paintbrush,
  Search,
  Settings2,
  Shapes,
  Sun,
  Table2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  searchText?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  open,
  mode,
  actions,
  onClose,
}: {
  open: boolean;
  mode: "commands" | "search";
  actions: CommandAction[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  const filtered = actions.filter((item) =>
    `${item.label} ${item.description} ${item.searchText ?? ""}`
      .toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es")),
  );
  const closePalette = () => {
    setQuery("");
    setSelected(0);
    onClose();
  };
  const run = (index: number) => {
    const item = filtered[index];
    if (item) {
      item.action();
      closePalette();
    }
  };
  return (
    <dialog
      ref={dialogRef}
      className="modal-backdrop command-backdrop"
      aria-modal="true"
      aria-label={mode === "search" ? "Buscar en el espacio" : "Paleta de comandos"}
      onCancel={(event) => { event.preventDefault(); closePalette(); }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePalette();
      }}
    >
      <div className="command-palette">
        <div className="command-input">
          <Search size={19} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((value) =>
                  Math.min(Math.max(0, filtered.length - 1), value + 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((value) => Math.max(0, value - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                run(selected);
              } else if (event.key === "Escape") closePalette();
            }}
            placeholder={
              mode === "search"
                ? "Buscar documentos, etiquetas y contenido…"
                : "Escribe un comando…"
            }
          />
          <button onClick={closePalette} aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>
        <div className="command-results">
          {filtered.length ? (
            filtered.map((item, index) => (
              <button
                key={item.id}
                className={index === selected ? "selected" : ""}
                onMouseEnter={() => setSelected(index)}
                onClick={() => run(index)}
              >
                <span className="command-icon">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <kbd>↵</kbd>
              </button>
            ))
          ) : (
            <div className="empty-results">
              No encontramos coincidencias para “{query}”.
            </div>
          )}
        </div>
        <div className="command-footer">
          <span>↑↓ Navegar</span>
          <span>↵ Abrir</span>
          <span>Esc Cerrar</span>
        </div>
      </div>
    </dialog>
  );
}

export const commandIcons = {
  add: <FilePlus2 />,
  export: <FileDown />,
  table: <Table2 />,
  draw: <Paintbrush />,
  flow: <Shapes />,
  settings: <Settings2 />,
  light: <Sun />,
  dark: <Moon />,
};
