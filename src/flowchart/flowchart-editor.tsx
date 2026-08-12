"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleStop, Diamond, Download, Pause, Play, Plus, RotateCcw, SkipForward, Square, TerminalSquare } from "lucide-react";
import type { FlowConnection, FlowNode, FlowNodeType } from "@/src/types/workspace";

interface FlowchartEditorProps { nodes: FlowNode[]; connections: FlowConnection[]; onChange: (nodes: FlowNode[], connections: FlowConnection[]) => void; }

const nodeMeta: Record<FlowNodeType, { label: string; icon: React.ReactNode }> = {
  start: { label: "Inicio / Fin", icon: <CircleStop size={16} /> }, input: { label: "Entrada", icon: <TerminalSquare size={16} /> }, decision: { label: "Decisión", icon: <Diamond size={16} /> }, process: { label: "Proceso", icon: <Square size={16} /> }, output: { label: "Salida", icon: <TerminalSquare size={16} /> }, end: { label: "Fin", icon: <CircleStop size={16} /> },
};

export function FlowchartEditor({ nodes, connections, onChange }: FlowchartEditorProps) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [age, setAge] = useState(18);
  const [speed, setSpeed] = useState(1);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const path = useMemo(() => ["start", "input", "decision", age >= 18 ? "adult" : "minor", "end"].filter((id) => nodes.some((node) => node.id === id)), [nodes, age]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => { if (step >= path.length - 1) setRunning(false); else setStep((value) => value + 1); }, 850 / speed);
    return () => window.clearTimeout(timer);
  }, [running, step, speed, path.length]);

  const addNode = (type: FlowNodeType) => { const id = `node-${crypto.randomUUID()}`; const next: FlowNode = { id, type, label: nodeMeta[type].label, x: 280 + (nodes.length % 3) * 90, y: 120 + nodes.length * 32 }; onChange([...nodes, next], connections); };
  const exportSvg = () => { const svg = document.querySelector(".flow-canvas svg"); if (!svg) return; const anchor = document.createElement("a"); anchor.download = "diagrama-lumina.svg"; anchor.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" })); anchor.click(); };

  return <div className="flow-layout">
    <div className="node-palette"><div className="palette-title">Elementos</div>{(["start", "process", "decision", "input", "output"] as FlowNodeType[]).map((type) => <button key={type} onClick={() => addNode(type)}>{nodeMeta[type].icon}<span>{nodeMeta[type].label}</span><Plus size={13} /></button>)}<div className="palette-tip">Arrastra los nodos para reorganizar el flujo.</div></div>
    <div className="flow-main">
      <div className="visual-toolbar"><strong>Simulador visual</strong><button onClick={() => { setStep(-1); setRunning(true); }}><Play size={16} /> Ejecutar</button><button onClick={() => setRunning(false)}><Pause size={16} /> Pausar</button><button onClick={() => setStep((value) => Math.min(path.length - 1, value + 1))}><SkipForward size={16} /> Paso</button><button onClick={() => { setRunning(false); setStep(-1); }}><RotateCcw size={16} /> Reiniciar</button><select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select><button onClick={exportSvg}><Download size={16} /> SVG</button></div>
      <div className="flow-canvas" onPointerMove={(event) => { if (!dragRef.current) return; const rect = event.currentTarget.getBoundingClientRect(); onChange(nodes.map((node) => node.id === dragRef.current?.id ? { ...node, x: event.clientX - rect.left - dragRef.current.dx, y: event.clientY - rect.top - dragRef.current.dy } : node), connections); }} onPointerUp={() => { dragRef.current = null; }}>
        <svg width="100%" height="100%" viewBox="0 0 760 570" preserveAspectRatio="xMidYMid meet"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa3b4" /></marker></defs>{connections.map((connection) => { const from = nodes.find((node) => node.id === connection.from); const to = nodes.find((node) => node.id === connection.to); if (!from || !to) return null; const x1 = from.x + 75, y1 = from.y + 46, x2 = to.x + 75, y2 = to.y; const midY = (y1 + y2) / 2; return <g key={connection.id}><path d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`} fill="none" stroke="#9aa3b4" strokeWidth="2" markerEnd="url(#arrow)" />{connection.label && <text x={(x1+x2)/2 + 8} y={midY - 5} fill="#6f7888" fontSize="13">{connection.label}</text>}</g>; })}{nodes.map((node) => { const active = path[step] === node.id; return <g key={node.id} transform={`translate(${node.x},${node.y})`} className={`svg-node type-${node.type} ${active ? "executing" : ""}`} onPointerDown={(event) => { const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (!box) return; dragRef.current = { id: node.id, dx: event.clientX - box.left - node.x, dy: event.clientY - box.top - node.y }; }}><rect width="150" height="46" rx={node.type === "start" || node.type === "end" ? 23 : 10} /><text x="75" y="29" textAnchor="middle">{node.label}</text></g>; })}</svg>
      </div>
    </div>
    <aside className="simulation-panel"><div className="sim-status"><span className={running ? "pulse" : ""} />{running ? "Ejecutando" : step >= 0 ? "Pausado" : "Listo"}</div><h3>Variables</h3><label>edad<input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} /></label><div className="variable-row"><span>resultado</span><code>{step >= 3 ? (age >= 18 ? '"Mayor"' : '"Menor"') : "—"}</code></div><h3>Entrada</h3><pre>&gt; Introduzca edad: {step >= 1 ? age : "_"}</pre><h3>Salida</h3><pre>&gt; {step >= 3 ? (age >= 18 ? "Usted es mayor de edad." : "Usted es menor de edad.") : "Esperando…"}</pre><h3>Recorrido</h3><ol>{path.map((id, index) => <li key={id} className={index === step ? "active" : index < step ? "done" : ""}>{nodes.find((node) => node.id === id)?.label}</li>)}</ol></aside>
  </div>;
}
