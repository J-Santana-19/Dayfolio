"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Circle, Diamond, Download, Eraser, Minus, Pencil, Redo2, Square, Trash2, Triangle, Undo2 } from "lucide-react";

interface DrawingCanvasProps { data?: string; onChange: (data: string) => void; }
type Tool = "pen" | "eraser" | "line" | "rect" | "circle" | "arrow" | "triangle" | "diamond";
type Brush = "pencil" | "pen" | "marker" | "highlighter" | "spray";
const MAX_HISTORY = 10;

export function DrawingCanvas({ data, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const changed = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const preview = useRef<ImageData | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const lastEmitted = useRef<string | undefined>(undefined);
  const [tool, setTool] = useState<Tool>("pen");
  const [brush, setBrush] = useState<Brush>("pencil");
  const [shapesOpen, setShapesOpen] = useState(false);
  const [color, setColor] = useState("#6f7f5a");
  const [width, setWidth] = useState(3);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || (data && data === lastEmitted.current)) return;
    if (!data) { context.clearRect(0, 0, canvas.width, canvas.height); return; }
    const image = new Image();
    image.onload = () => { context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); };
    image.src = data;
  }, [data]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width), y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height) };
  };
  const configure = (context: CanvasRenderingContext2D) => {
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.globalAlpha = tool === "pen" && brush === "highlighter" ? 0.24 : tool === "pen" && brush === "marker" ? 0.58 : 1;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = tool === "eraser" ? Math.min(48, width * 2) : tool === "pen" && brush === "highlighter" ? width * 5 : tool === "pen" && brush === "marker" ? width * 2.5 : tool === "pen" && brush === "pencil" ? Math.max(1, width * 0.65) : width;
    context.lineCap = "round";
    context.lineJoin = "round";
  };
  const refreshHistoryState = () => setHistoryState({ canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 });
  const commit = () => {
    const canvas = canvasRef.current;
    if (canvas) { const next = canvas.toDataURL("image/png"); lastEmitted.current = next; onChange(next); }
    refreshHistoryState();
  };
  const rememberUndo = (snapshot: ImageData) => { undoStack.current.push(snapshot); undoStack.current = undoStack.current.slice(-MAX_HISTORY); };
  const rememberRedo = (snapshot: ImageData) => { redoStack.current.push(snapshot); redoStack.current = redoStack.current.slice(-MAX_HISTORY); };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const current = context.getImageData(0, 0, canvas.width, canvas.height);
    rememberUndo(current);
    redoStack.current = [];
    preview.current = current;
    changed.current = false;
    drawing.current = true;
    startPoint.current = point(event);
    configure(context);
    context.beginPath();
    context.moveTo(startPoint.current.x, startPoint.current.y);
    canvas.setPointerCapture(event.pointerId);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const end = point(event);
    configure(context);
    changed.current = true;
    if (tool === "pen" && brush === "spray") {
      const radius = Math.max(5, width * 2.4);
      for (let index = 0; index < 22; index++) { const angle = Math.random() * Math.PI * 2; const distance = Math.sqrt(Math.random()) * radius; context.fillRect(end.x + Math.cos(angle) * distance, end.y + Math.sin(angle) * distance, 1.4, 1.4); }
      return;
    }
    if (tool === "pen" || tool === "eraser") { context.lineTo(end.x, end.y); context.stroke(); return; }
    if (preview.current) context.putImageData(preview.current, 0, 0);
    configure(context);
    context.beginPath();
    const origin = startPoint.current;
    if (tool === "line") { context.moveTo(origin.x, origin.y); context.lineTo(end.x, end.y); }
    else if (tool === "rect") context.rect(origin.x, origin.y, end.x - origin.x, end.y - origin.y);
    else if (tool === "circle") context.ellipse((end.x + origin.x) / 2, (end.y + origin.y) / 2, Math.max(1, Math.abs(end.x - origin.x) / 2), Math.max(1, Math.abs(end.y - origin.y) / 2), 0, 0, Math.PI * 2);
    else if (tool === "arrow") {
      const angle = Math.atan2(end.y - origin.y, end.x - origin.x); const size = Math.max(10, width * 4);
      context.moveTo(origin.x, origin.y); context.lineTo(end.x, end.y); context.moveTo(end.x, end.y); context.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6)); context.moveTo(end.x, end.y); context.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
    } else if (tool === "triangle") { context.moveTo((origin.x + end.x) / 2, origin.y); context.lineTo(end.x, end.y); context.lineTo(origin.x, end.y); context.closePath(); }
    else { const midX = (origin.x + end.x) / 2; const midY = (origin.y + end.y) / 2; context.moveTo(midX, origin.y); context.lineTo(end.x, midY); context.lineTo(midX, end.y); context.lineTo(origin.x, midY); context.closePath(); }
    context.stroke();
  };

  const stop = () => {
    if (!drawing.current) return;
    drawing.current = false;
    preview.current = null;
    if (!changed.current) { undoStack.current.pop(); refreshHistoryState(); return; }
    commit();
  };
  const clear = () => {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d");
    if (!canvas || !context || !window.confirm("¿Limpiar todo el lienzo? Podrás deshacer esta acción.")) return;
    rememberUndo(context.getImageData(0, 0, canvas.width, canvas.height)); redoStack.current = []; context.clearRect(0, 0, canvas.width, canvas.height); commit();
  };
  const undo = () => {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d"); const previous = undoStack.current.pop();
    if (!canvas || !context || !previous) return;
    rememberRedo(context.getImageData(0, 0, canvas.width, canvas.height)); context.putImageData(previous, 0, 0); commit();
  };
  const redo = () => {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d"); const next = redoStack.current.pop();
    if (!canvas || !context || !next) return;
    rememberUndo(context.getImageData(0, 0, canvas.width, canvas.height)); context.putImageData(next, 0, 0); commit();
  };
  const download = () => { const anchor = document.createElement("a"); anchor.download = "dibujo-mi-diario.png"; anchor.href = canvasRef.current?.toDataURL("image/png") ?? ""; anchor.click(); };

  return <div className="visual-workspace">
    <div className="visual-toolbar">
      <label className="brush-picker"><Pencil /><select aria-label="Tipo de trazo" value={brush} onChange={(event) => { setBrush(event.target.value as Brush); setTool("pen"); }}><option value="pencil">Lápiz</option><option value="pen">Pluma</option><option value="marker">Marcador</option><option value="highlighter">Resaltador</option><option value="spray">Spray</option></select></label>
      <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")}><Eraser /> Borrador</ToolButton>
      <span />
      <div className="shape-picker"><button className={tool !== "pen" && tool !== "eraser" ? "active" : ""} onClick={() => setShapesOpen((value) => !value)} aria-haspopup="menu" aria-expanded={shapesOpen}><Square /> Figuras <ChevronDown /></button>{shapesOpen && <div className="shape-menu" role="menu"><button onClick={() => { setTool("line"); setShapesOpen(false); }}><Minus /> Línea</button><button onClick={() => { setTool("arrow"); setShapesOpen(false); }}><ArrowUpRight /> Flecha</button><button onClick={() => { setTool("rect"); setShapesOpen(false); }}><Square /> Rectángulo</button><button onClick={() => { setTool("circle"); setShapesOpen(false); }}><Circle /> Elipse</button><button onClick={() => { setTool("triangle"); setShapesOpen(false); }}><Triangle /> Triángulo</button><button onClick={() => { setTool("diamond"); setShapesOpen(false); }}><Diamond /> Rombo</button></div>}</div>
      <span />
      <input aria-label="Color del trazo" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      <label className="stroke-width">Grosor <input aria-label="Grosor del trazo" type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      <button onClick={undo} disabled={!historyState.canUndo} title="Deshacer" aria-label="Deshacer"><Undo2 /></button><button onClick={redo} disabled={!historyState.canRedo} title="Rehacer" aria-label="Rehacer"><Redo2 /></button><button onClick={clear} title="Limpiar lienzo" aria-label="Limpiar lienzo"><Trash2 /></button><button onClick={download}><Download /> PNG</button>
    </div>
    <div className="canvas-stage"><canvas ref={canvasRef} width={1200} height={760} role="img" aria-label="Lienzo de dibujo editable" tabIndex={0} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }} /></div>
    <div className="canvas-hint">Cada trazo se guarda automáticamente. El borrador elimina solo la zona que recorres.</div>
  </div>;
}

function ToolButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={active ? "active" : ""} aria-pressed={active} onClick={onClick}>{children}</button>; }
