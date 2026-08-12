"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Feather, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { WorkspaceDocument } from "@/src/types/workspace";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const stripHtml = (html: string) => {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.innerText.replace(/\s+/g, " ").trim();
};

export function CalendarView({ documents, onOpenDate }: { documents: WorkspaceDocument[]; onOpenDate: (key: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const journalByDate = useMemo(() => new Map(documents.filter((doc) => !doc.trashed && doc.folder === "Diario").map((doc) => [doc.journalDate ?? dateKey(new Date(doc.createdAt)), doc])), [documents]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(gridStart); day.setDate(gridStart.getDate() + index); return day; });
  const selectedDoc = journalByDate.get(selected);
  const monthEntries = [...journalByDate.entries()].filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).sort(([a], [b]) => a.localeCompare(b));

  return <div className="calendar-page">
    <header className="calendar-header">
      <div><span className="calendar-kicker">TU HISTORIA, DÍA A DÍA</span><h1>Calendario del diario</h1><p>Explora todo lo que has escrito y vuelve a cualquier día.</p></div>
      <div className="calendar-controls"><button onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Mes anterior"><ChevronLeft /></button><button className="today-control" onClick={() => { const today = new Date(); setCursor(today); setSelected(dateKey(today)); }}>Hoy</button><button onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Mes siguiente"><ChevronRight /></button></div>
    </header>
    <div className="calendar-book">
      <section className="month-panel">
        <div className="month-title"><CalendarDays /><h2>{new Intl.DateTimeFormat("es-PA", { month: "long", year: "numeric" }).format(cursor)}</h2><span>{monthEntries.length} {monthEntries.length === 1 ? "entrada" : "entradas"}</span></div>
        <div className="weekday-row">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-grid">{days.map((day) => {
          const key = dateKey(day); const entry = journalByDate.get(key); const muted = day.getMonth() !== month; const today = key === dateKey(new Date());
          return <button key={key} className={`calendar-day ${muted ? "muted" : ""} ${selected === key ? "selected" : ""} ${entry ? "has-entry" : ""}`} onClick={() => setSelected(key)} onDoubleClick={() => onOpenDate(key)}>
            <span className={today ? "today-number" : ""}>{day.getDate()}</span>
            {entry ? <><strong>{entry.emoji} {entry.title.split(",")[0]}</strong><small>{stripHtml(entry.tabs[0]?.content ?? "").slice(0, 62)}</small></> : !muted && <em>—</em>}
          </button>;
        })}</div>
      </section>
      <aside className="day-preview">
        <span className="preview-date">{new Intl.DateTimeFormat("es-PA", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${selected}T12:00:00`))}</span>
        {selectedDoc ? <><div className="preview-icon">{selectedDoc.emoji}</div><h2>{selectedDoc.title}</h2><div className="preview-tags">{selectedDoc.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><p>{stripHtml(selectedDoc.tabs[0]?.content ?? "").slice(0, 420)}</p><button className="journal-open" onClick={() => onOpenDate(selected)}><Feather /> Abrir entrada</button></> : <div className="empty-day"><div className="leaf-mark">❧</div><h2>Una página en blanco</h2><p>Este día todavía no tiene recuerdos. Puedes comenzar cuando quieras.</p><button className="journal-open" onClick={() => onOpenDate(selected)}><Plus /> Escribir este día</button></div>}
        <div className="month-notes"><h3>Entradas de este mes</h3>{monthEntries.slice(0, 5).map(([key, doc]) => <button key={key} onClick={() => { setSelected(key); onOpenDate(key); }}><span>{new Date(`${key}T12:00:00`).getDate()}</span><div><strong>{doc.title.split(",")[0]}</strong><small>{stripHtml(doc.tabs[0]?.content ?? "").slice(0, 54)}</small></div></button>)}</div>
      </aside>
    </div>
  </div>;
}
