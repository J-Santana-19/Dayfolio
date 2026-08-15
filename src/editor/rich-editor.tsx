/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-to-interactive-role */
"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Code2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoveDown,
  MoveUp,
  Palette,
  Quote,
  Redo2,
  Search,
  Table2,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { sanitizeHtml, sanitizeLinkUrl } from "@/src/security/sanitize-html";
import { TextInputDialog } from "@/src/components/text-input-dialog";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  spellCheck?: boolean;
  showToolbar?: boolean;
  toolbarMode?: "compact" | "expanded";
  onToolbarModeChange?: (mode: "compact" | "expanded") => void;
  zoom?: number;
}

const commands = [
  {
    label: "Título grande",
    hint: "Encabezado H1",
    command: "formatBlock",
    value: "h1",
    icon: "H1",
  },
  {
    label: "Lista de tareas",
    hint: "Checklist rápida",
    command: "checklist",
    icon: "☑",
  },
  { label: "Tabla", hint: "3 filas × 3 columnas", command: "table", icon: "▦" },
  {
    label: "Bloque de código",
    hint: "Código con formato",
    command: "formatBlock",
    value: "pre",
    icon: "</>",
  },
  {
    label: "Cita",
    hint: "Destaca una idea",
    command: "formatBlock",
    value: "blockquote",
    icon: "❝",
  },
] as const;
const SAFE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function RichEditor({
  content,
  onChange,
  spellCheck = true,
  showToolbar = true,
  toolbarMode = "compact",
  onToolbarModeChange,
  zoom = 100,
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [selectedCell, setSelectedCell] = useState<HTMLTableCellElement | null>(null);
  const [imageWidth, setImageWidth] = useState(70);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    kind: "image" | "text";
  } | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");
  const [editorNotice, setEditorNotice] = useState("");
  const lastContent = useRef("");
  const savedRange = useRef<Range | null>(null);

  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection?.rangeCount && ref.current?.contains(selection.anchorNode))
      savedRange.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const ensureCaretVisible = useCallback(() => {
    const editor = ref.current;
    const scroller = editor?.closest<HTMLElement>(".paper-scroll");
    const selection = window.getSelection();
    if (!editor || !scroller || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return;
    const caret = selection.getRangeAt(0).getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    const margin = 56;
    if (caret.bottom > viewport.bottom - margin) scroller.scrollTop += caret.bottom - viewport.bottom + margin;
    else if (caret.top < viewport.top + margin) scroller.scrollTop -= viewport.top - caret.top + margin;
  }, []);

  useLayoutEffect(() => {
    if (ref.current && content !== lastContent.current) {
      const safeContent = sanitizeHtml(content);
      ref.current.innerHTML = safeContent;
      lastContent.current = safeContent;
    }
  }, [content]);

  const sync = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastContent.current = html;
    onChange(html);
  }, [onChange]);

  const exec = useCallback(
    (command: string, value?: string) => {
      ref.current?.focus();
      if (savedRange.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRange.current);
      }
      if (command === "table")
        document.execCommand(
          "insertHTML",
          false,
          "<table><thead><tr><th>Encabezado</th><th>Encabezado</th><th>Encabezado</th></tr></thead><tbody><tr><td>Dato</td><td>Dato</td><td>Dato</td></tr><tr><td>Dato</td><td>Dato</td><td>Dato</td></tr></tbody></table><p><br></p>",
        );
      else if (command === "createLink") {
        setLinkValue("");
        setLinkError("");
        setLinkDialogOpen(true);
        return;
      } else if (command === "checklist") {
        document.execCommand("insertUnorderedList");
        const selection = window.getSelection();
        const origin = selection?.anchorNode;
        const element = origin instanceof Element ? origin : origin?.parentElement;
        const list = element?.closest("ul");
        list?.classList.add("checklist");
      } else if (command === "foreColor" || command === "hiliteColor")
        document.execCommand(command, false, value);
      else document.execCommand(command, false, value);
      sync();
    },
    [sync],
  );

  const confirmLink = useCallback(() => {
    const safeUrl = sanitizeLinkUrl(linkValue);
    if (!safeUrl) {
      setLinkError("Usa un enlace http(s), correo, teléfono o enlace interno válido.");
      return;
    }
    ref.current?.focus();
    const selection = window.getSelection();
    if (savedRange.current) {
      selection?.removeAllRanges();
      selection?.addRange(savedRange.current);
    }
    document.execCommand("createLink", false, safeUrl);
    const anchor = window.getSelection()?.anchorNode?.parentElement?.closest("a");
    anchor?.setAttribute("rel", "noopener noreferrer");
    sync();
    setLinkDialogOpen(false);
    setLinkError("");
  }, [linkValue, sync]);

  const insertImageFile = useCallback(
    (file: File) => {
      if (!SAFE_IMAGE_TYPES.has(file.type)) {
        setEditorNotice("Formato de imagen no compatible. Usa PNG, JPEG, WebP o GIF.");
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        setEditorNotice("La imagen supera 12 MB. Reduce su tamaño e intenta nuevamente.");
        return;
      }
      captureSelection();
      const reader = new FileReader();
      reader.onerror = () => setEditorNotice("No fue posible cargar esta imagen.");
      reader.onload = () => {
        ref.current?.focus();
        if (savedRange.current) {
          const current = window.getSelection();
          current?.removeAllRanges();
          current?.addRange(savedRange.current);
        }
        const src = typeof reader.result === "string" ? reader.result : "";
        document.execCommand(
          "insertHTML",
          false,
          `<figure class="editor-image" contenteditable="false" style="width:70%;margin:24px auto"><img src="${src}" alt="Imagen insertada" style="width:100%;height:auto"><figcaption>Imagen</figcaption></figure><p><br></p>`,
        );
        sync();
      };
      reader.readAsDataURL(file);
    },
    [sync, captureSelection],
  );

  const mutateImage = (
    action:
      | "delete"
      | "duplicate"
      | "up"
      | "down"
      | "left"
      | "center"
      | "right",
  ) => {
    const image = selectedImage;
    const figure = image?.closest("figure");
    if (!figure) return;
    if (action === "delete") figure.remove();
    else if (action === "duplicate")
      figure.parentNode?.insertBefore(
        figure.cloneNode(true),
        figure.nextSibling,
      );
    else if (action === "up" && figure.previousElementSibling)
      figure.parentElement?.insertBefore(figure, figure.previousElementSibling);
    else if (action === "down" && figure.nextElementSibling)
      figure.parentElement?.insertBefore(figure.nextElementSibling, figure);
    else if (action === "left")
      (figure as HTMLElement).style.margin = "24px auto 24px 0";
    else if (action === "right")
      (figure as HTMLElement).style.margin = "24px 0 24px auto";
    else if (action === "center")
      (figure as HTMLElement).style.margin = "24px auto";
    setSelectedImage(null);
    sync();
  };

  const resizeImage = (value: number) => {
    const figure = selectedImage?.closest("figure") as HTMLElement | null;
    if (!figure) return;
    figure.style.width = `${value}%`;
    setImageWidth(value);
    sync();
  };

  const mutateTable = (action: "add-row" | "add-column" | "delete-row" | "delete-column") => {
    const cell = selectedCell;
    const table = cell?.closest("table");
    const row = cell?.closest("tr");
    if (!cell || !table || !row) return;
    const rows = Array.from(table.rows);
    const cellIndex = cell.cellIndex;
    if (action === "add-row") {
      const next = table.insertRow(row.rowIndex + 1);
      const count = Math.max(1, row.cells.length);
      for (let index = 0; index < count; index++) {
        const created = next.insertCell();
        created.innerHTML = "Dato";
      }
      setSelectedCell(next.cells[Math.min(cellIndex, next.cells.length - 1)] ?? null);
    } else if (action === "add-column") {
      rows.forEach((currentRow, rowIndex) => {
        const created = currentRow.insertCell(Math.min(cellIndex + 1, currentRow.cells.length));
        created.outerHTML = rowIndex === 0 && table.tHead ? "<th>Encabezado</th>" : "<td>Dato</td>";
      });
    } else if (action === "delete-row" && rows.length > 1) {
      table.deleteRow(row.rowIndex);
      setSelectedCell(table.rows[Math.min(row.rowIndex, table.rows.length - 1)]?.cells[Math.min(cellIndex, (table.rows[0]?.cells.length ?? 1) - 1)] ?? null);
    } else if (action === "delete-column" && row.cells.length > 1) {
      rows.forEach((currentRow) => currentRow.cells[cellIndex]?.remove());
      setSelectedCell(row.cells[Math.min(cellIndex, row.cells.length - 1)] ?? null);
    }
    sync();
  };

  return (
    <div
      className="editor-shell"
      style={{ "--workspace-zoom": zoom / 100 } as React.CSSProperties}
    >
      {showToolbar && (
        <div
          className={`format-toolbar toolbar-${toolbarMode}`}
          role="toolbar"
          aria-label="Formato de texto"
          onMouseDownCapture={captureSelection}
        >
          <div className="toolbar-group essential">
            <select
              aria-label="Estilo de párrafo"
              onChange={(e) => exec("formatBlock", e.target.value)}
              defaultValue="p"
            >
              <option value="p">Texto</option>
              <option value="h1">Título 1</option>
              <option value="h2">Título 2</option>
              <option value="h3">Título 3</option>
            </select>
            <ToolbarButton
              label="Deshacer (Ctrl+Z)"
              onClick={() => exec("undo")}
            >
              <Undo2 />
            </ToolbarButton>
            <ToolbarButton
              label="Rehacer (Ctrl+Y)"
              onClick={() => exec("redo")}
            >
              <Redo2 />
            </ToolbarButton>
          </div>
          <span className="toolbar-separator" />
          <div className="toolbar-group essential">
            <ToolbarButton
              label="Negrita (Ctrl+B)"
              onClick={() => exec("bold")}
            >
              <Bold />
            </ToolbarButton>
            <ToolbarButton
              label="Cursiva (Ctrl+I)"
              onClick={() => exec("italic")}
            >
              <Italic />
            </ToolbarButton>
            <ToolbarButton
              label="Subrayado (Ctrl+U)"
              onClick={() => exec("underline")}
            >
              <Underline />
            </ToolbarButton>
            <ToolbarButton
              label="Resaltar"
              onClick={() => exec("hiliteColor", "#fff2a8")}
            >
              <Highlighter />
            </ToolbarButton>
          </div>
          <span className="toolbar-separator expanded-only" />
          <div className="toolbar-group expanded-only">
            <select
              aria-label="Fuente"
              onChange={(e) => exec("fontName", e.target.value)}
              defaultValue="Georgia"
            >
              <option>Georgia</option>
              <option>Playfair Display</option>
              <option>Lato</option>
              <option>Times New Roman</option>
              <option>Arial</option>
              <option>Trebuchet MS</option>
              <option>Verdana</option>
              <option>Courier New</option>
            </select>
            <select
              aria-label="Tamaño del texto"
              onChange={(e) => exec("fontSize", e.target.value)}
              defaultValue="3"
            >
              <option value="2">Pequeño</option>
              <option value="3">Normal</option>
              <option value="4">Grande</option>
              <option value="5">Muy grande</option>
            </select>
            <label className="toolbar-color" title="Color del texto">
              <Palette />
              <input
                aria-label="Color del texto"
                type="color"
                defaultValue="#2f231d"
                onChange={(e) => exec("foreColor", e.target.value)}
              />
            </label>
          </div>
          <span className="toolbar-separator expanded-only" />
          <div className="toolbar-group expanded-only">
            <ToolbarButton
              label="Alinear a la izquierda"
              onClick={() => exec("justifyLeft")}
            >
              <AlignLeft />
            </ToolbarButton>
            <ToolbarButton
              label="Centrar"
              onClick={() => exec("justifyCenter")}
            >
              <AlignCenter />
            </ToolbarButton>
            <ToolbarButton
              label="Alinear a la derecha"
              onClick={() => exec("justifyRight")}
            >
              <AlignRight />
            </ToolbarButton>
            <ToolbarButton
              label="Lista"
              onClick={() => exec("insertUnorderedList")}
            >
              <List />
            </ToolbarButton>
            <ToolbarButton
              label="Lista numerada"
              onClick={() => exec("insertOrderedList")}
            >
              <ListOrdered />
            </ToolbarButton>
            <ToolbarButton
              label="Checklist"
              onClick={() => exec("checklist")}
            >
              <CheckSquare />
            </ToolbarButton>
          </div>
          <span className="toolbar-separator expanded-only" />
          <div className="toolbar-group expanded-only">
            <ToolbarButton label="Enlace" onClick={() => exec("createLink")}>
              <Link2 />
            </ToolbarButton>
            <ToolbarButton
              label="Cita"
              onClick={() => exec("formatBlock", "blockquote")}
            >
              <Quote />
            </ToolbarButton>
            <ToolbarButton
              label="Código"
              onClick={() => exec("formatBlock", "pre")}
            >
              <Code2 />
            </ToolbarButton>
            <ToolbarButton label="Tabla" onClick={() => exec("table")}>
              <Table2 />
            </ToolbarButton>
            <ToolbarButton
              label="Separador"
              onClick={() => exec("insertHorizontalRule")}
            >
              <Minus />
            </ToolbarButton>
            <label className="toolbar-button" title="Insertar imagen">
              <ImagePlus />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (file) insertImageFile(file);
                }}
              />
            </label>
          </div>
          <button
            className="toolbar-toggle"
            aria-label={
              toolbarMode === "compact"
                ? "Expandir barra de herramientas"
                : "Contraer barra de herramientas"
            }
            title={
              toolbarMode === "compact"
                ? "Mostrar todas las herramientas"
                : "Mostrar solo lo esencial"
            }
            onClick={() =>
              onToolbarModeChange?.(
                toolbarMode === "compact" ? "expanded" : "compact",
              )
            }
          >
            {toolbarMode === "compact" ? <ChevronDown /> : <ChevronUp />}
            <span>{toolbarMode === "compact" ? "Más" : "Menos"}</span>
          </button>
        </div>
      )}
      {selectedImage && (
        <div
          className="image-toolbar"
          role="toolbar"
          aria-label="Herramientas de imagen"
        >
          <label>
            Ancho{" "}
            <input
              type="range"
              min="20"
              max="100"
              value={imageWidth}
              onChange={(e) => resizeImage(Number(e.target.value))}
            />
          </label>
          <button onClick={() => resizeImage(50)}>50%</button>
          <button onClick={() => resizeImage(75)}>75%</button>
          <button onClick={() => resizeImage(100)}>100%</button>
          <button onClick={() => mutateImage("left")}>Izquierda</button>
          <button onClick={() => mutateImage("center")}>Centro</button>
          <button onClick={() => mutateImage("right")}>Derecha</button>
          <button title="Mover arriba" onClick={() => mutateImage("up")}>
            <MoveUp />
          </button>
          <button title="Mover abajo" onClick={() => mutateImage("down")}>
            <MoveDown />
          </button>
          <button onClick={() => mutateImage("duplicate")}>Duplicar</button>
          <button className="danger" onClick={() => mutateImage("delete")}>
            <Trash2 /> Eliminar
          </button>
        </div>
      )}
      {selectedCell && (
        <div className="table-toolbar" role="toolbar" aria-label="Herramientas de tabla">
          <strong>Tabla</strong>
          <button onClick={() => mutateTable("add-row")}>+ Fila</button>
          <button onClick={() => mutateTable("add-column")}>+ Columna</button>
          <button onClick={() => mutateTable("delete-row")}>Eliminar fila</button>
          <button onClick={() => mutateTable("delete-column")}>Eliminar columna</button>
          <button aria-label="Cerrar herramientas de tabla" onClick={() => setSelectedCell(null)}>×</button>
        </div>
      )}
      {editorNotice && (
        <div className="editor-notice" role="alert">
          <span>{editorNotice}</span>
          <button type="button" onClick={() => setEditorNotice("")}>Cerrar</button>
        </div>
      )}
      <div className="paper-scroll">
        <article
          ref={ref}
          className="rich-editor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          suppressContentEditableWarning
          spellCheck={spellCheck}
          onClick={(e) => {
            setContext(null);
            const anchor = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
            if (anchor) {
              const href = sanitizeLinkUrl(anchor.getAttribute("href") ?? "");
              if (href) {
                e.preventDefault();
                if (href.startsWith("#") || href.startsWith("/")) window.location.assign(href);
                else window.open(href, "_blank", "noopener,noreferrer");
                return;
              }
            }
            const cell = (e.target as HTMLElement).closest("td, th") as HTMLTableCellElement | null;
            setSelectedCell(cell && ref.current?.contains(cell) ? cell : null);
            const checklistItem = (e.target as HTMLElement).closest(
              "ul.checklist > li",
            ) as HTMLLIElement | null;
            if (checklistItem) {
              const bounds = checklistItem.getBoundingClientRect();
              if (e.clientX === 0 || e.clientX <= bounds.left + 30) {
                checklistItem.classList.toggle("checked");
                sync();
                return;
              }
            }
            const image = (e.target as HTMLElement).closest(
              "img",
            ) as HTMLImageElement | null;
            setSelectedImage(image);
            if (image) {
              const figure = image.closest("figure") as HTMLElement | null;
              const match = figure?.style.width.match(/([\d.]+)%/);
              setImageWidth(match ? Number(match[1]) : 70);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const image = (e.target as HTMLElement).closest(
              "img",
            ) as HTMLImageElement | null;
            setSelectedImage(image);
            setContext({
              x: Math.min(e.clientX, window.innerWidth - 210),
              y: Math.min(e.clientY, window.innerHeight - 260),
              kind: image ? "image" : "text",
            });
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
              e.preventDefault();
              exec("redo");
            }
            if (
              selectedImage &&
              (e.key === "Delete" || e.key === "Backspace")
            ) {
              e.preventDefault();
              mutateImage("delete");
            }
          }}
          onKeyUp={captureSelection}
          onMouseUp={captureSelection}
          onBlur={captureSelection}
          onInput={(e) => {
            captureSelection();
            const text = e.currentTarget.innerText;
            const match = text.match(/(?:^|\s)\/([^\s]*)$/);
            setSlashOpen(Boolean(match));
            setSlashQuery(match?.[1] ?? "");
            sync();
            window.requestAnimationFrame(ensureCaretVisible);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const image = Array.from(e.clipboardData.items)
              .find((item) => item.type.startsWith("image/"))
              ?.getAsFile();
            if (image) {
              insertImageFile(image);
              return;
            }
            const html = e.clipboardData.getData("text/html");
            const plain = e.clipboardData.getData("text/plain");
            document.execCommand(
              html ? "insertHTML" : "insertText",
              false,
              html ? sanitizeHtml(html) : plain,
            );
            sync();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = Array.from(e.dataTransfer.files).find((item) =>
              item.type.startsWith("image/"),
            );
            if (file) insertImageFile(file);
          }}
        />
        {slashOpen && (
          <div className="slash-menu">
            <div className="slash-title">Insertar bloque</div>
            {commands
              .filter((item) =>
                item.label.toLowerCase().includes(slashQuery.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    for (let index = 0; index <= slashQuery.length; index++)
                      document.execCommand("delete");
                    exec(
                      item.command,
                      "value" in item ? item.value : undefined,
                    );
                    setSlashOpen(false);
                  }}
                >
                  <span>{item.icon}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
      {context && (
        <div
          className="editor-context-menu"
          style={{ left: context.x, top: context.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {context.kind === "image" ? (
            <>
              <button onClick={() => mutateImage("duplicate")}>
                Duplicar imagen
              </button>
              <button onClick={() => mutateImage("center")}>Centrar</button>
              <button onClick={() => mutateImage("up")}>Traer adelante</button>
              <button onClick={() => mutateImage("down")}>Enviar atrás</button>
              <button className="danger" onClick={() => mutateImage("delete")}>
                Eliminar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => exec("copy")}>Copiar</button>
              <button onClick={() => exec("cut")}>Cortar</button>
              <button onClick={() => exec("bold")}>Negrita</button>
              <button onClick={() => exec("italic")}>Cursiva</button>
              <button onClick={() => setContext(null)}>
                <Search /> Cerrar
              </button>
            </>
          )}
        </div>
      )}
      <TextInputDialog
        open={linkDialogOpen}
        title="Insertar enlace"
        label="Dirección del enlace"
        value={linkValue}
        placeholder="https://ejemplo.com"
        maxLength={2048}
        error={linkError}
        confirmLabel="Insertar enlace"
        onChange={(value) => {
          setLinkValue(value);
          setLinkError("");
        }}
        onCancel={() => {
          setLinkDialogOpen(false);
          setLinkError("");
        }}
        onConfirm={confirmLink}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="toolbar-button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
