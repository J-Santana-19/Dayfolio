"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Download, Eraser, Minus, Pencil, Redo2, Square, Trash2, Undo2 } from "lucide-react";

interface DrawingCanvasProps { data?: string; onChange: (data: string) => void; }
type Tool = "pen" | "eraser" | "line" | "rect" | "circle";

export function DrawingCanvas({ data, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const preview = useRef<ImageData | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#6f7f5a");
  const [width, setWidth] = useState(3);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  useEffect(() => { const canvas = canvasRef.current; if (!canvas || !data) return; const image = new Image(); image.onload = () => canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height); image.src = data; }, [data]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width), y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height) }; };
  const configure = (ctx: CanvasRenderingContext2D) => { ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"; ctx.strokeStyle = color; ctx.lineWidth = tool === "eraser" ? width * 4 : width; ctx.lineCap = "round"; ctx.lineJoin = "round"; };
  const commit = () => { const canvas = canvasRef.current; if (canvas) onChange(canvas.toDataURL("image/png")); setHistoryState({ canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 }); };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height); undoStack.current.push(current); redoStack.current = []; preview.current = current;
    drawing.current = true; startPoint.current = point(event); configure(ctx); ctx.beginPath(); ctx.moveTo(startPoint.current.x, startPoint.current.y); canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; const ctx = event.currentTarget.getContext("2d"); if (!ctx) return; const end = point(event); configure(ctx);
    if (tool === "pen" || tool === "eraser") { ctx.lineTo(end.x, end.y); ctx.stroke(); return; }
    if (preview.current) ctx.putImageData(preview.current, 0, 0); ctx.beginPath();
    if (tool === "line") { ctx.moveTo(startPoint.current.x, startPoint.current.y); ctx.lineTo(end.x, end.y); }
    else if (tool === "rect") ctx.rect(startPoint.current.x, startPoint.current.y, end.x - startPoint.current.x, end.y - startPoint.current.y);
    else { const rx = Math.abs(end.x - startPoint.current.x) / 2; const ry = Math.abs(end.y - startPoint.current.y) / 2; ctx.ellipse((end.x + startPoint.current.x) / 2, (end.y + startPoint.current.y) / 2, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); }
    ctx.stroke();
  };
  const stop = () => { if (!drawing.current) return; drawing.current = false; preview.current = null; commit(); };
  const clear = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return; undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); redoStack.current = []; ctx.clearRect(0, 0, canvas.width, canvas.height); commit(); };
  const undo = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); const previous = undoStack.current.pop(); if (!canvas || !ctx || !previous) return; redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); ctx.putImageData(previous, 0, 0); commit(); };
  const redo = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); const next = redoStack.current.pop(); if (!canvas || !ctx || !next) return; undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); ctx.putImageData(next, 0, 0); commit(); };
  const download = () => { const anchor = document.createElement("a"); anchor.download = "dibujo-lumina.png"; anchor.href = canvasRef.current?.toDataURL("image/png") ?? ""; anchor.click(); };

  return <div className="visual-workspace"><div className="visual-toolbar"><ToolButton active={tool === "pen"} onClick={() => setTool("pen")}><Pencil /> Lápiz</ToolButton><ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")}><Eraser /> Borrador</ToolButton><span /><ToolButton active={tool === "line"} onClick={() => setTool("line")}><Minus /> Línea</ToolButton><ToolButton active={tool === "rect"} onClick={() => setTool("rect")}><Square /> Rectángulo</ToolButton><ToolButton active={tool === "circle"} onClick={() => setTool("circle")}><Circle /> Elipse</ToolButton><span /><input aria-label="Color del trazo" type="color" value={color} onChange={(event) => setColor(event.target.value)} /><input aria-label="Grosor del trazo" type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /><button onClick={undo} disabled={!historyState.canUndo} title="Deshacer"><Undo2 /></button><button onClick={redo} disabled={!historyState.canRedo} title="Rehacer"><Redo2 /></button><button onClick={clear} title="Limpiar lienzo"><Trash2 /></button><button onClick={download}><Download /> PNG</button></div><div className="canvas-stage"><canvas ref={canvasRef} width={1200} height={760} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} /></div><div className="canvas-hint">Lápiz, borrador y figuras guardan sus cambios automáticamente.</div></div>;
}

function ToolButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={active ? "active" : ""} onClick={onClick}>{children}</button>; }
