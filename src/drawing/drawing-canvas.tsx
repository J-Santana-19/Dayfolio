"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Download, Eraser, Minus, Pencil, Redo2, Square, Trash2, Undo2 } from "lucide-react";

interface DrawingCanvasProps { data?: string; onChange: (data: string) => void; }

export function DrawingCanvas({ data, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#344fd1");
  const [width, setWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !data) return;
    const image = new Image(); image.onload = () => canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height); image.src = data;
  }, [data]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width), y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height) }; };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); drawing.current = true; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId); };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = event.currentTarget.getContext("2d"); if (!ctx) return; const p = point(event); ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"; ctx.strokeStyle = color; ctx.lineWidth = tool === "eraser" ? width * 4 : width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stop = () => { if (!drawing.current || !canvasRef.current) return; drawing.current = false; onChange(canvasRef.current.toDataURL("image/png")); };
  const clear = () => { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); ctx.clearRect(0, 0, canvas.width, canvas.height); onChange(""); };
  const undo = () => { const canvas = canvasRef.current; const last = history.current.pop(); if (canvas && last) { canvas.getContext("2d")?.putImageData(last, 0, 0); onChange(canvas.toDataURL("image/png")); } };
  const download = () => { const anchor = document.createElement("a"); anchor.download = "dibujo-lumina.png"; anchor.href = canvasRef.current?.toDataURL("image/png") ?? ""; anchor.click(); };

  return <div className="visual-workspace"><div className="visual-toolbar"><button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}><Pencil size={16} /> Lápiz</button><button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}><Eraser size={16} /> Borrador</button><span /><button title="Línea"><Minus size={16} /></button><button title="Rectángulo"><Square size={16} /></button><button title="Círculo"><Circle size={16} /></button><span /><input aria-label="Color del trazo" type="color" value={color} onChange={(e) => setColor(e.target.value)} /><input aria-label="Grosor" type="range" min="1" max="18" value={width} onChange={(e) => setWidth(Number(e.target.value))} /><button onClick={undo}><Undo2 size={16} /></button><button disabled><Redo2 size={16} /></button><button onClick={clear}><Trash2 size={16} /></button><button onClick={download}><Download size={16} /> PNG</button></div><div className="canvas-stage"><canvas ref={canvasRef} width={1200} height={760} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} /></div><div className="canvas-hint">Dibuja libremente con mouse, lápiz o toque. Tus trazos se guardan automáticamente.</div></div>;
}
