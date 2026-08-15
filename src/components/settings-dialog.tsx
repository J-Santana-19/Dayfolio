/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */
"use client";

import {
  Check,
  Download,
  Eye,
  FileText,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceState } from "@/src/types/workspace";
import { downloadBackup } from "@/src/utils/exporters";
import {
  MAX_BACKUP_BYTES,
  parseWorkspaceBackup,
} from "@/src/database/validation";

type SettingsSection = "appearance" | "editor" | "data";

export function SettingsDialog({
  state,
  onChange,
  onRestore,
  onReset,
  onClose,
}: {
  state: WorkspaceState;
  onChange: (state: WorkspaceState) => void;
  onRestore: (state: WorkspaceState) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [section, setSection] = useState<SettingsSection>("appearance");
  const [dataMessage, setDataMessage] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="modal-backdrop settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])',
            ) ?? [],
          ).filter((element) => element.offsetParent !== null);
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <aside className="settings-nav">
          <div className="settings-brand">
            <span>❧</span>
            <div>
              <strong>{state.workspaceName}</strong>
              <small>Preferencias</small>
            </div>
          </div>
          <button
            className={section === "appearance" ? "active" : ""}
            onClick={() => setSection("appearance")}
          >
            <Palette /> Apariencia
          </button>
          <button
            className={section === "editor" ? "active" : ""}
            onClick={() => setSection("editor")}
          >
            <FileText /> Editor
          </button>
          <button
            className={section === "data" ? "active" : ""}
            onClick={() => setSection("data")}
          >
            <SlidersHorizontal /> Datos y seguridad
          </button>
          <div className="settings-nav-note">
            Todos los cambios se guardan automáticamente en este dispositivo.
          </div>
        </aside>
        <div className="settings-content">
          <header>
            <div>
              <span className="modal-kicker">CONFIGURACIÓN</span>
              <h2 id="settings-title">
                {section === "appearance"
                  ? "Apariencia"
                  : section === "editor"
                    ? "Experiencia del editor"
                    : "Datos y seguridad"}
              </h2>
            </div>
            <button
              ref={closeRef}
              className="icon-button"
              onClick={onClose}
              aria-label="Cerrar preferencias"
            >
              <X />
            </button>
          </header>
          {section === "appearance" && (
            <>
              <SettingBlock
                icon={<Eye />}
                title="Nombre del espacio"
                description="Personaliza el título de tu agenda."
              >
                <input
                  className="settings-text-input"
                  maxLength={120}
                  value={state.workspaceName}
                  onChange={(event) =>
                    onChange({ ...state, workspaceName: event.target.value })
                  }
                  aria-label="Nombre del espacio"
                />
              </SettingBlock>
              <SettingBlock
                icon={<Sun />}
                title="Tema"
                description="Elige la atmósfera que te resulte más cómoda."
              >
                <div className="theme-options">
                  <button
                    className={state.theme === "light" ? "selected" : ""}
                    onClick={() => onChange({ ...state, theme: "light" })}
                  >
                    <Sun />
                    Papel crema{state.theme === "light" && <Check />}
                  </button>
                  <button
                    className={state.theme === "dark" ? "selected" : ""}
                    onClick={() => onChange({ ...state, theme: "dark" })}
                  >
                    <Moon />
                    Noche tinta{state.theme === "dark" && <Check />}
                  </button>
                </div>
              </SettingBlock>
              <SettingBlock
                icon={<Palette />}
                title="Color de acento"
                description="Se aplica a botones, selección y detalles del cuaderno."
              >
                <div className="accent-options">
                  {[
                    { color: "#6f7f5a", name: "Oliva" },
                    { color: "#a8b79a", name: "Salvia" },
                    { color: "#c96f5a", name: "Terracota" },
                    { color: "#8b6b4d", name: "Marrón" },
                    { color: "#b98262", name: "Canela" },
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      style={{ background: color }}
                      className={state.accent === color ? "selected" : ""}
                      onClick={() => onChange({ ...state, accent: color })}
                      aria-label={name}
                    >
                      {state.accent === color && <Check />}
                    </button>
                  ))}
                </div>
              </SettingBlock>
              <SettingBlock
                icon={<FileText />}
                title="Ancho de página"
                description="Controla cuánto espacio ocupa la hoja."
              >
                <Segmented
                  options={[
                    { value: "compact", label: "Íntimo" },
                    { value: "comfortable", label: "Clásico" },
                    { value: "wide", label: "Amplio" },
                  ]}
                  value={state.documentWidth}
                  onSelect={(documentWidth) =>
                    onChange({ ...state, documentWidth })
                  }
                />
              </SettingBlock>
              <Toggle
                label="Reducir movimiento"
                description="Desactiva transiciones y animaciones decorativas."
                checked={state.reduceMotion}
                onChange={(reduceMotion) =>
                  onChange({ ...state, reduceMotion })
                }
              />
            </>
          )}
          {section === "editor" && (
            <>
              <SettingBlock
                icon={<FileText />}
                title="Tipografía"
                description="Define la personalidad del texto que escribes."
              >
                <Segmented
                  options={[
                    { value: "serif", label: "Editorial" },
                    { value: "sans", label: "Limpia" },
                    { value: "mono", label: "Monoespacio" },
                  ]}
                  value={state.editorFont}
                  onSelect={(editorFont) => onChange({ ...state, editorFont })}
                />
              </SettingBlock>
              <SettingBlock
                icon={<SlidersHorizontal />}
                title="Tamaño de texto"
                description="Ajusta la lectura y la densidad de la página."
              >
                <Segmented
                  options={[
                    { value: "small", label: "Pequeño" },
                    { value: "medium", label: "Mediano" },
                    { value: "large", label: "Grande" },
                  ]}
                  value={state.fontSize}
                  onSelect={(fontSize) => onChange({ ...state, fontSize })}
                />
              </SettingBlock>
              <SettingBlock
                icon={<FileText />}
                title="Interlineado"
                description="Controla la separación entre líneas."
              >
                <Segmented
                  options={[
                    { value: "compact", label: "Compacto" },
                    { value: "comfortable", label: "Cómodo" },
                    { value: "relaxed", label: "Relajado" },
                  ]}
                  value={state.lineHeight}
                  onSelect={(lineHeight) => onChange({ ...state, lineHeight })}
                />
              </SettingBlock>
              <Toggle
                label="Corrector ortográfico"
                description="Marca palabras que podrían necesitar revisión."
                checked={state.spellCheck}
                onChange={(spellCheck) => onChange({ ...state, spellCheck })}
              />
              <Toggle
                label="Mostrar barra de formato"
                description="Mantiene visibles las herramientas de texto."
                checked={state.showToolbar}
                onChange={(showToolbar) => onChange({ ...state, showToolbar })}
              />
              <SettingBlock
                icon={<SlidersHorizontal />}
                title="Barra de formato"
                description="Elige cuántas herramientas aparecen al abrir un documento."
              >
                <Segmented
                  options={[
                    { value: "compact", label: "Compacta" },
                    { value: "expanded", label: "Completa" },
                  ]}
                  value={state.toolbarMode}
                  onSelect={(toolbarMode) =>
                    onChange({ ...state, toolbarMode })
                  }
                />
              </SettingBlock>
              <Toggle
                label="Ajustar diagramas a la cuadrícula"
                description="Facilita la alineación uniforme al mover o redimensionar figuras."
                checked={state.snapToGrid}
                onChange={(snapToGrid) => onChange({ ...state, snapToGrid })}
              />
              <SettingBlock
                icon={<SlidersHorizontal />}
                title="Tamaño de cuadrícula"
                description="Define la precisión del ajuste de figuras."
              >
                <Segmented
                  options={[
                    { value: "10", label: "Fina" },
                    { value: "20", label: "Normal" },
                    { value: "40", label: "Amplia" },
                  ]}
                  value={String(state.gridSize)}
                  onSelect={(gridSize) =>
                    onChange({ ...state, gridSize: Number(gridSize) })
                  }
                />
              </SettingBlock>
            </>
          )}
          {section === "data" && (
            <>
              <div className="privacy-card">
                <span>🔒</span>
                <div>
                  <strong>Privado y local-first</strong>
                  <p>
                    Tus documentos se almacenan en el navegador de este
                    dispositivo. La versión publicada no envía el contenido de
                    tus notas a un servidor.
                  </p>
                </div>
              </div>
              <SettingBlock
                icon={<Download />}
                title="Copia de seguridad"
                description="Guarda todos tus documentos, dibujos, diagramas y preferencias."
              >
                <div>
                  <div className="backup-actions">
                    <button onClick={() => downloadBackup(state)}>
                      <Download /> Crear copia JSON
                    </button>
                    <button onClick={() => inputRef.current?.click()}>
                      <Upload /> Restaurar copia
                    </button>
                    <input
                      ref={inputRef}
                      hidden
                      type="file"
                      accept="application/json,.json"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (!file) return;
                        setDataMessage("");
                        try {
                          if (file.size > MAX_BACKUP_BYTES)
                            throw new Error(
                              "La copia supera el límite de 50 MB.",
                            );
                          const restored = parseWorkspaceBackup(
                            await file.text(),
                          );
                          if (
                            window.confirm(
                              "La copia reemplazará el espacio actual. ¿Deseas continuar?",
                            )
                          ) {
                            onRestore(restored);
                            onClose();
                          }
                        } catch (error) {
                          setDataMessage(
                            error instanceof Error
                              ? error.message
                              : "No fue posible leer la copia de seguridad.",
                          );
                        }
                      }}
                    />
                  </div>
                  {dataMessage && (
                    <p className="settings-data-message" role="alert">
                      {dataMessage}
                    </p>
                  )}
                </div>
              </SettingBlock>
              <div className="danger-zone">
                <div>
                  <strong>Restablecer espacio de demostración</strong>
                  <p>
                    Elimina los datos locales actuales y recupera el contenido
                    inicial.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Se reemplazarán todas tus notas locales. Esta acción no se puede deshacer sin una copia de seguridad. ¿Continuar?",
                      )
                    ) {
                      onReset();
                      onClose();
                    }
                  }}
                >
                  <RotateCcw /> Restablecer
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingBlock({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-block">
      <div className="setting-copy">
        <span>{icon}</span>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "selected" : ""}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        className={`switch ${checked ? "on" : ""}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
