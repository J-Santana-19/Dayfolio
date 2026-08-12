"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import type { WorkspaceDocument } from "@/src/types/workspace";

export function TrashView({ documents, onRestore, onDelete }: { documents: WorkspaceDocument[]; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  const trashed = documents.filter((doc) => doc.trashed);
  return <div className="utility-page"><span className="calendar-kicker">ORGANIZACIÓN</span><h1>Papelera</h1><p>Las notas eliminadas permanecen aquí hasta que decidas restaurarlas o borrarlas definitivamente.</p><div className="trash-list">{trashed.length ? trashed.map((doc) => <div key={doc.id}><span>{doc.emoji}</span><div><strong>{doc.title}</strong><small>{doc.folder} · {new Intl.DateTimeFormat("es-PA", { dateStyle: "medium" }).format(doc.updatedAt)}</small></div><button onClick={() => onRestore(doc.id)}><RotateCcw /> Restaurar</button><button className="danger" onClick={() => onDelete(doc.id)}><Trash2 /> Eliminar</button></div>) : <div className="empty-trash"><Trash2 /><h2>La papelera está vacía</h2><p>No hay nada que limpiar.</p></div>}</div></div>;
}
