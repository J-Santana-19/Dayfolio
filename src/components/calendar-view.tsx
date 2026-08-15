"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Feather,
  Heart,
  Plus,
  Quote,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { WorkspaceDocument } from "@/src/types/workspace";
import { sanitizeHtml } from "@/src/security/sanitize-html";
import { localDateKey, shiftedMonthStart } from "@/src/core/workspace-rules";
import "./calendar-view.css";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
type CalendarMode = "month" | "week" | "list";

const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const stripHtml = (html: string) => {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const node = document.createElement("div");
  node.innerHTML = sanitizeHtml(html);
  return node.innerText.replace(/\s+/g, " ").trim();
};

const entryExcerpt = (entry: WorkspaceDocument, limit = 92) => {
  const text = stripHtml(entry.tabs[0]?.content ?? "")
    .replace(entry.title, "")
    .replace(/(?:MI DIARIO|DAYFOLIO)\s*[·•-]?\s*\d{4}-\d{2}-\d{2}/gi, "")
    .replace(/Un espacio íntimo para recordar tu día\.?/gi, "")
    .replace(/Resumen del día/gi, "")
    .replace(/Gratitud/gi, "")
    .replace(/Pendientes/gi, "")
    .replace(/Empieza a escribir[.…]*/gi, "")
    .trim();
  return text ? `${text.slice(0, limit)}${text.length > limit ? "…" : ""}` : "Entrada de diario";
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

export function CalendarView({
  documents,
  onOpenDate,
}: {
  documents: WorkspaceDocument[];
  onOpenDate: (key: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => localDateKey(new Date()));
  const [mode, setMode] = useState<CalendarMode>("month");

  const journalByDate = useMemo(
    () =>
      new Map(
        documents
          .filter((doc) => !doc.trashed && doc.folder === "Diario")
          .sort((a, b) => a.updatedAt - b.updatedAt)
          .map((doc) => [doc.journalDate ?? localDateKey(new Date(doc.createdAt)), doc]),
      ),
    [documents],
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const monthDays = Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, index) => new Date(year, month, index + 1),
  );
  const selectedDate = dateFromKey(selected);
  const selectedDoc = journalByDate.get(selected);
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEntries = [...journalByDate.entries()]
    .filter(([key]) => key.startsWith(monthPrefix))
    .sort(([a], [b]) => a.localeCompare(b));
  const todayKey = localDateKey(new Date());

  const selectDay = (day: Date) => {
    setSelected(localDateKey(day));
    if (day.getMonth() !== month || day.getFullYear() !== year) setCursor(day);
  };

  const goToday = () => {
    const today = new Date();
    setCursor(today);
    setSelected(localDateKey(today));
  };

  const navigate = (amount: number) => {
    if (mode === "week") {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + amount * 7);
      setCursor(next);
      setSelected(localDateKey(next));
      return;
    }
    const next = shiftedMonthStart(year, month, amount);
    setCursor(next);
    setSelected(localDateKey(next));
  };

  const rangeTitle =
    mode === "week"
      ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} de ${new Intl.DateTimeFormat("es-PA", {
          month: "long",
          year: "numeric",
        }).format(weekDays[6])}`
      : new Intl.DateTimeFormat("es-PA", { month: "long", year: "numeric" }).format(cursor);

  const renderDay = (day: Date) => {
    const key = localDateKey(day);
    const entry = journalByDate.get(key);
    const muted = day.getMonth() !== month;
    const isSelected = selected === key;
    return (
      <button
        key={key}
        className={`calendar-day ${muted ? "muted" : ""} ${isSelected ? "selected" : ""} ${entry ? "has-entry" : ""}`}
        onClick={() => selectDay(day)}
        onDoubleClick={() => onOpenDate(key)}
        aria-label={`${new Intl.DateTimeFormat("es-PA", { dateStyle: "full" }).format(day)}${entry ? ", con entrada" : ""}`}
        aria-pressed={isSelected}
      >
        <span className={key === todayKey ? "today-number" : ""}>{day.getDate()}</span>
        {entry && (
          <div className="calendar-entry-chip">
            <strong>{capitalize(new Intl.DateTimeFormat("es-PA", { weekday: "long" }).format(day))}</strong>
            <small>{entryExcerpt(entry, 48)}</small>
          </div>
        )}
        {entry && <i aria-hidden="true" />}
      </button>
    );
  };

  return (
    <div className="calendar-page">
      <div className={`calendar-book calendar-mode-${mode}`}>
        <section className="month-panel" aria-labelledby="calendar-title">
          <header className="calendar-book-toolbar">
            <div className="calendar-month-nav">
              <button onClick={() => navigate(-1)} aria-label={mode === "week" ? "Semana anterior" : "Mes anterior"}>
                <ChevronLeft />
              </button>
              <button onClick={() => navigate(1)} aria-label={mode === "week" ? "Semana siguiente" : "Mes siguiente"}>
                <ChevronRight />
              </button>
              <h1 id="calendar-title">{capitalize(rangeTitle)}</h1>
            </div>
            <div className="calendar-toolbar-actions">
              <button className="calendar-today" onClick={goToday}>Hoy</button>
              <div className="calendar-view-switcher" aria-label="Vista del calendario">
                {([
                  ["month", "Mes"],
                  ["week", "Semana"],
                  ["list", "Lista"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    className={mode === value ? "active" : ""}
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="calendar-month-meta">
            <span><CalendarDays /> Calendario del diario</span>
            <span>{monthEntries.length} {monthEntries.length === 1 ? "entrada" : "entradas"}</span>
          </div>

          {mode === "month" && (
            <>
              <div className="weekday-row">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
              <div className="month-grid">{days.map(renderDay)}</div>
              <div className="mobile-calendar-list">
                {monthDays.map((day) => {
                  const key = localDateKey(day);
                  const entry = journalByDate.get(key);
                  return (
                    <button
                      key={key}
                      className={`${selected === key ? "selected" : ""} ${entry ? "has-entry" : ""}`}
                      onClick={() => selectDay(day)}
                      onDoubleClick={() => onOpenDate(key)}
                    >
                      <span className={key === todayKey ? "today-number" : ""}>{day.getDate()}</span>
                      <div>
                        <strong>{capitalize(new Intl.DateTimeFormat("es-PA", { weekday: "long" }).format(day))}</strong>
                        <small>{entry ? entryExcerpt(entry, 76) : "Sin entrada"}</small>
                      </div>
                      {entry && <i aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {mode === "week" && (
            <div className="calendar-week-view">
              {weekDays.map((day) => {
                const key = localDateKey(day);
                const entry = journalByDate.get(key);
                return (
                  <button
                    key={key}
                    className={`${selected === key ? "selected" : ""} ${entry ? "has-entry" : ""}`}
                    onClick={() => selectDay(day)}
                    onDoubleClick={() => onOpenDate(key)}
                  >
                    <span>{capitalize(new Intl.DateTimeFormat("es-PA", { weekday: "long" }).format(day))}</span>
                    <strong className={key === todayKey ? "today-number" : ""}>{day.getDate()}</strong>
                    <div>{entry ? <><b>{entry.title}</b><small>{entryExcerpt(entry, 130)}</small></> : <em>Página en blanco</em>}</div>
                  </button>
                );
              })}
            </div>
          )}

          {mode === "list" && (
            <div className="calendar-agenda-list">
              {monthEntries.length ? monthEntries.map(([key, entry]) => {
                const day = dateFromKey(key);
                return (
                  <button key={key} className={selected === key ? "selected" : ""} onClick={() => setSelected(key)} onDoubleClick={() => onOpenDate(key)}>
                    <span><strong>{day.getDate()}</strong><small>{capitalize(new Intl.DateTimeFormat("es-PA", { weekday: "short" }).format(day))}</small></span>
                    <div><strong>{entry.title}</strong><small>{entryExcerpt(entry, 150)}</small></div>
                    <ChevronRight />
                  </button>
                );
              }) : <div className="calendar-list-empty"><Feather /><strong>Este mes todavía está en blanco</strong><span>Elige un día para comenzar a escribir.</span></div>}
            </div>
          )}
        </section>

        <aside className="day-preview" aria-live="polite">
          <span className="preview-date"><CalendarDays /> {new Intl.DateTimeFormat("es-PA", { dateStyle: "full" }).format(selectedDate)}</span>
          {selectedDoc ? (
            <div className="selected-day-content">
              <div className="preview-icon">{selectedDoc.emoji}</div>
              <h2>{selectedDoc.title}</h2>
              <p>{entryExcerpt(selectedDoc, 360)}</p>
              {selectedDoc.tags.length > 0 && <div className="preview-tags">{selectedDoc.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
              <button className="journal-open" onClick={() => onOpenDate(selected)}><Feather /> Abrir entrada</button>
            </div>
          ) : (
            <div className="empty-day">
              <div className="feather-mark"><Feather /><span>✦</span></div>
              <h2>Una página en blanco</h2>
              <p>Este día todavía no tiene recuerdos. Puedes comenzar cuando quieras.</p>
              <button className="journal-open" onClick={() => onOpenDate(selected)}><Plus /> Escribir este día</button>
            </div>
          )}

          <div className="month-notes">
            <h3><span>Entradas de este mes</span></h3>
            {monthEntries.length ? monthEntries.slice(0, 6).map(([key, entry]) => {
              const day = dateFromKey(key);
              return (
                <button key={key} className={selected === key ? "active" : ""} onClick={() => setSelected(key)} onDoubleClick={() => onOpenDate(key)}>
                  <span><strong>{day.getDate()}</strong><small>{capitalize(new Intl.DateTimeFormat("es-PA", { weekday: "short" }).format(day))}</small></span>
                  <div><strong>{capitalize(new Intl.DateTimeFormat("es-PA", { weekday: "long" }).format(day))}</strong><small>{entryExcerpt(entry, 60)}</small></div>
                  <i aria-hidden="true" />
                </button>
              );
            }) : <p className="month-notes-empty">Aún no hay entradas este mes.</p>}
          </div>

          <div className="calendar-quote">
            <Quote />
            <p>Cada día es una nueva página para escribir tu historia.</p>
            <Heart />
          </div>
        </aside>
      </div>
    </div>
  );
}
