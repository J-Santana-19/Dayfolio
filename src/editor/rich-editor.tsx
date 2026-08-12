"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, CheckSquare, Code2, Highlighter, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Table2, Underline, Undo2 } from "lucide-react";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  spellCheck?: boolean;
  showToolbar?: boolean;
}

const commands = [
  { label: "Título grande", hint: "Encabezado H1", command: "formatBlock", value: "h1", icon: "H1" },
  { label: "Lista de tareas", hint: "Checklist rápida", command: "insertUnorderedList", icon: "☑" },
  { label: "Tabla", hint: "3 filas × 3 columnas", command: "table", icon: "▦" },
  { label: "Bloque de código", hint: "Código con formato", command: "formatBlock", value: "pre", icon: "</>" },
  { label: "Cita", hint: "Destaca una idea", command: "formatBlock", value: "blockquote", icon: "❝" },
] as const;

export function RichEditor({ content, onChange, spellCheck = true, showToolbar = true }: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const lastContent = useRef("");

  useLayoutEffect(() => {
    if (ref.current && content !== lastContent.current) { ref.current.innerHTML = content; lastContent.current = content; }
  }, [content]);

  const sync = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastContent.current = html;
    onChange(html);
  };

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    if (command === "table") {
      document.execCommand("insertHTML", false, "<table><thead><tr><th>Encabezado</th><th>Encabezado</th><th>Encabezado</th></tr></thead><tbody><tr><td>Dato</td><td>Dato</td><td>Dato</td></tr><tr><td>Dato</td><td>Dato</td><td>Dato</td></tr></tbody></table><p><br></p>");
    } else if (command === "createLink") {
      const url = window.prompt("Dirección del enlace");
      if (url) document.execCommand(command, false, url);
    } else if (command === "insertHorizontalRule") {
      document.execCommand(command);
    } else document.execCommand(command, false, value);
    sync();
  };

  const insertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { document.execCommand("insertHTML", false, `<figure contenteditable="false"><img src="${reader.result}" alt="Imagen pegada"><figcaption contenteditable="true">Añadir pie de imagen</figcaption></figure><p><br></p>`); sync(); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="editor-shell">
      {showToolbar && <div className="format-toolbar" role="toolbar" aria-label="Formato de texto">
        <select aria-label="Estilo de párrafo" onChange={(event) => exec("formatBlock", event.target.value)} defaultValue="p"><option value="p">Texto</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option></select>
        <ToolbarButton label="Deshacer" onClick={() => exec("undo")}><Undo2 size={16} /></ToolbarButton><ToolbarButton label="Rehacer" onClick={() => exec("redo")}><Redo2 size={16} /></ToolbarButton><span className="toolbar-separator" />
        <ToolbarButton label="Negrita" onClick={() => exec("bold")}><Bold size={16} /></ToolbarButton><ToolbarButton label="Cursiva" onClick={() => exec("italic")}><Italic size={16} /></ToolbarButton><ToolbarButton label="Subrayado" onClick={() => exec("underline")}><Underline size={16} /></ToolbarButton><ToolbarButton label="Resaltar" onClick={() => exec("hiliteColor", "#fff2a8")}><Highlighter size={16} /></ToolbarButton><span className="toolbar-separator" />
        <ToolbarButton label="Alinear a la izquierda" onClick={() => exec("justifyLeft")}><AlignLeft size={16} /></ToolbarButton><ToolbarButton label="Centrar" onClick={() => exec("justifyCenter")}><AlignCenter size={16} /></ToolbarButton><ToolbarButton label="Alinear a la derecha" onClick={() => exec("justifyRight")}><AlignRight size={16} /></ToolbarButton>
        <ToolbarButton label="Lista" onClick={() => exec("insertUnorderedList")}><List size={16} /></ToolbarButton><ToolbarButton label="Lista numerada" onClick={() => exec("insertOrderedList")}><ListOrdered size={16} /></ToolbarButton><ToolbarButton label="Checklist" onClick={() => exec("insertUnorderedList")}><CheckSquare size={16} /></ToolbarButton><span className="toolbar-separator" />
        <ToolbarButton label="Enlace" onClick={() => exec("createLink")}><Link2 size={16} /></ToolbarButton><ToolbarButton label="Cita" onClick={() => exec("formatBlock", "blockquote")}><Quote size={16} /></ToolbarButton><ToolbarButton label="Código" onClick={() => exec("formatBlock", "pre")}><Code2 size={16} /></ToolbarButton><ToolbarButton label="Tabla" onClick={() => exec("table")}><Table2 size={16} /></ToolbarButton><ToolbarButton label="Separador" onClick={() => exec("insertHorizontalRule")}><Minus size={16} /></ToolbarButton>
        <label className="toolbar-button" title="Insertar imagen"><ImagePlus size={16} /><input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && insertImageFile(event.target.files[0])} /></label>
      </div>}
      <div className="paper-scroll">
        <article
          ref={ref}
          className="rich-editor"
          contentEditable
          suppressContentEditableWarning
          spellCheck={spellCheck}
          onInput={(event) => {
            const text = event.currentTarget.innerText;
            const match = text.match(/(?:^|\s)\/([^\s]*)$/);
            setSlashOpen(Boolean(match)); setSlashQuery(match?.[1] ?? ""); sync();
          }}
          onPaste={(event) => {
            const image = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"))?.getAsFile();
            if (image) { event.preventDefault(); insertImageFile(image); }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/")); if (file) { event.preventDefault(); insertImageFile(file); } }}
        />
        {slashOpen && <div className="slash-menu"><div className="slash-title">Insertar bloque</div>{commands.filter((item) => item.label.toLowerCase().includes(slashQuery.toLowerCase())).map((item) => <button key={item.label} onClick={() => { document.execCommand("delete"); exec(item.command, "value" in item ? item.value : undefined); setSlashOpen(false); }}><span>{item.icon}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</div>}
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button className="toolbar-button" title={label} aria-label={label} onMouseDown={(event) => { event.preventDefault(); onClick(); }}>{children}</button>; }
