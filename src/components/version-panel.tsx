"use client";

import { Clock3, RotateCcw, X } from "lucide-react";
import type { VersionSnapshot } from "@/src/types/workspace";

export function VersionPanel({ versions, onSave, onRestore, onClose }: { versions: VersionSnapshot[]; onSave: () => void; onRestore: (id: string) => void; onClose: () => void }) {
  return <aside className="version-panel"><div className="panel-header"><div><span>HISTORIAL</span><h2>Versiones</h2></div><button onClick={onClose}><X /></button></div><button className="primary-button full" onClick={onSave}>Guardar versión actual</button><div className="version-list">{versions.length ? versions.map((version) => <div key={version.id}><div className="version-icon"><Clock3 /></div><div><strong>{version.label}</strong><span>{new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short" }).format(version.createdAt)}</span><small>{version.tabs.length} pestañas</small></div><button title="Restaurar" onClick={() => { if (window.confirm("¿Restaurar esta versión? La versión actual permanecerá en el historial.")) onRestore(version.id); }}><RotateCcw /></button></div>) : <div className="empty-history"><Clock3 /><strong>Aún no hay versiones</strong><p>Guarda una versión antes de realizar cambios importantes.</p></div>}</div></aside>;
}
