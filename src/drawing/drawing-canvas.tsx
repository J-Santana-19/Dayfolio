"use client";

import { useEffect, useRef, useState } from "react";
import {
  Circle,
  Download,
  Eraser,
  Minus,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";

interface DrawingCanvasProps {
  data?: string;
  onChange: (data: string) => void;
}
type Tool = "pen" | "eraser" | "line" | "rect" | "circle";
const MAX_HISTORY = 10;

export function DrawingCanvas({ data, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const changed = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const preview = useRef<ImageData | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#6f7f5a");
  const [width, setWidth] = useState(3);
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (!data) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = data;
  }, [data]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y:
        (event.clientY - rect.top) * (event.currentTarget.height / rect.height),
    };
  };
  const configure = (context: CanvasRenderingContext2D) => {
    context.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = color;
    context.lineWidth = tool === "eraser" ? width * 4 : width;
    context.lineCap = "round";
    context.lineJoin = "round";
  };
  const refreshHistoryState = () =>
    setHistoryState({
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    });
  const commit = () => {
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
    refreshHistoryState();
  };
  const rememberUndo = (snapshot: ImageData) => {
    undoStack.current.push(snapshot);
    undoStack.current = undoStack.current.slice(-MAX_HISTORY);
  };
  const rememberRedo = (snapshot: ImageData) => {
    redoStack.current.push(snapshot);
    redoStack.current = redoStack.current.slice(-MAX_HISTORY);
  };

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
    if (tool === "pen" || tool === "eraser") {
      context.lineTo(end.x, end.y);
      context.stroke();
      return;
    }
    if (preview.current) context.putImageData(preview.current, 0, 0);
    context.beginPath();
    if (tool === "line") {
      context.moveTo(startPoint.current.x, startPoint.current.y);
      context.lineTo(end.x, end.y);
    } else if (tool === "rect")
      context.rect(
        startPoint.current.x,
        startPoint.current.y,
        end.x - startPoint.current.x,
        end.y - startPoint.current.y,
      );
    else {
      const rx = Math.abs(end.x - startPoint.current.x) / 2;
      const ry = Math.abs(end.y - startPoint.current.y) / 2;
      context.ellipse(
        (end.x + startPoint.current.x) / 2,
        (end.y + startPoint.current.y) / 2,
        Math.max(1, rx),
        Math.max(1, ry),
        0,
        0,
        Math.PI * 2,
      );
    }
    context.stroke();
  };
  const stop = () => {
    if (!drawing.current) return;
    drawing.current = false;
    preview.current = null;
    if (!changed.current) {
      undoStack.current.pop();
      refreshHistoryState();
      return;
    }
    commit();
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    rememberUndo(context.getImageData(0, 0, canvas.width, canvas.height));
    redoStack.current = [];
    context.clearRect(0, 0, canvas.width, canvas.height);
    commit();
  };
  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = undoStack.current.pop();
    if (!canvas || !context || !previous) return;
    rememberRedo(context.getImageData(0, 0, canvas.width, canvas.height));
    context.putImageData(previous, 0, 0);
    commit();
  };
  const redo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const next = redoStack.current.pop();
    if (!canvas || !context || !next) return;
    rememberUndo(context.getImageData(0, 0, canvas.width, canvas.height));
    context.putImageData(next, 0, 0);
    commit();
  };
  const download = () => {
    const anchor = document.createElement("a");
    anchor.download = "dibujo-lumina.png";
    anchor.href = canvasRef.current?.toDataURL("image/png") ?? "";
    anchor.click();
  };

  return (
    <div className="visual-workspace">
      <div className="visual-toolbar">
        <ToolButton active={tool === "pen"} onClick={() => setTool("pen")}>
          <Pencil /> Lápiz
        </ToolButton>
        <ToolButton
          active={tool === "eraser"}
          onClick={() => setTool("eraser")}
        >
          <Eraser /> Borrador
        </ToolButton>
        <span />
        <ToolButton active={tool === "line"} onClick={() => setTool("line")}>
          <Minus /> Línea
        </ToolButton>
        <ToolButton active={tool === "rect"} onClick={() => setTool("rect")}>
          <Square /> Rectángulo
        </ToolButton>
        <ToolButton
          active={tool === "circle"}
          onClick={() => setTool("circle")}
        >
          <Circle /> Elipse
        </ToolButton>
        <span />
        <input
          aria-label="Color del trazo"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <input
          aria-label="Grosor del trazo"
          type="range"
          min="1"
          max="18"
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
        <button
          onClick={undo}
          disabled={!historyState.canUndo}
          title="Deshacer"
          aria-label="Deshacer"
        >
          <Undo2 />
        </button>
        <button
          onClick={redo}
          disabled={!historyState.canRedo}
          title="Rehacer"
          aria-label="Rehacer"
        >
          <Redo2 />
        </button>
        <button
          onClick={clear}
          title="Limpiar lienzo"
          aria-label="Limpiar lienzo"
        >
          <Trash2 />
        </button>
        <button onClick={download}>
          <Download /> PNG
        </button>
      </div>
      <div className="canvas-stage">
        <canvas
          ref={canvasRef}
          width={1200}
          height={760}
          role="img"
          aria-label="Lienzo de dibujo editable"
          tabIndex={0}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
          onKeyDown={(event) => {
            if (
              (event.ctrlKey || event.metaKey) &&
              event.key.toLowerCase() === "z"
            ) {
              event.preventDefault();
              undo();
            } else if (
              (event.ctrlKey || event.metaKey) &&
              event.key.toLowerCase() === "y"
            ) {
              event.preventDefault();
              redo();
            }
          }}
        />
      </div>
      <div className="canvas-hint">
        Lápiz, borrador y figuras guardan sus cambios automáticamente.
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={active ? "active" : ""}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
