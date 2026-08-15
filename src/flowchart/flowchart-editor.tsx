/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, react-hooks/refs */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  BringToFront,
  CircleStop,
  Clipboard,
  Copy,
  Diamond,
  Download,
  Group,
  Link2,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  SendToBack,
  SkipForward,
  Square,
  TerminalSquare,
  Trash2,
  Undo2,
  Ungroup,
} from "lucide-react";
import type {
  FlowConnection,
  FlowNode,
  FlowNodeType,
} from "@/src/types/workspace";
import { TextInputDialog } from "@/src/components/text-input-dialog";

interface FlowchartEditorProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  onChange: (nodes: FlowNode[], connections: FlowConnection[]) => void;
  snapToGrid?: boolean;
  gridSize?: number;
  zoom?: number;
}
type Snapshot = { nodes: FlowNode[]; connections: FlowConnection[] };
const MAX_HISTORY = 50;

const nodeMeta: Record<FlowNodeType, { label: string; icon: React.ReactNode }> =
  {
    start: { label: "Inicio / Fin", icon: <CircleStop /> },
    input: { label: "Entrada", icon: <TerminalSquare /> },
    decision: { label: "Decisión", icon: <Diamond /> },
    process: { label: "Proceso", icon: <Square /> },
    output: { label: "Salida", icon: <TerminalSquare /> },
    subprocess: { label: "Subproceso", icon: <Square /> },
    connector: { label: "Conector", icon: <Link2 /> },
    end: { label: "Fin", icon: <CircleStop /> },
  };
const sizeOf = (node: FlowNode) => ({
  width: node.width ?? 150,
  height: node.height ?? 52,
});
const normalize = (node: FlowNode, index: number): FlowNode => ({
  width: 150,
  height: 52,
  fill: "#fffaf1",
  stroke: "#8c806f",
  strokeWidth: 2,
  zIndex: index,
  ...node,
});

export function FlowchartEditor({
  nodes: rawNodes,
  connections,
  onChange,
  snapToGrid = true,
  gridSize = 20,
  zoom = 100,
}: FlowchartEditorProps) {
  const nodes = useMemo(() => rawNodes.map(normalize), [rawNodes]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(
    null,
  );
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [age, setAge] = useState(18);
  const [speed, setSpeed] = useState(1);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    kind: "node" | "connection" | "canvas";
  } | null>(null);
  const [labelDialog, setLabelDialog] = useState<{
    nodeId: string;
    value: string;
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false,
  });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const clipboard = useRef<Snapshot>({ nodes: [], connections: [] });
  const inspectorSnapshot = useRef<Snapshot | null>(null);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedNode = selected.length === 1 ? nodes.find((node) => node.id === selected[0]) : undefined;
  const runSimulation = () => { setStep(0); setRunning(true); };
  const path = useMemo(() => {
    const result: string[] = [];
    const visited = new Set<string>();
    let current: FlowNode | undefined = nodes.find((node) => node.type === "start") ?? nodes[0];
    while (
      current &&
      !visited.has(current.id) &&
      result.length <= nodes.length
    ) {
      result.push(current.id);
      visited.add(current.id);
      const outgoing = connections.filter(
        (connection) => connection.from === current!.id,
      );
      let next = outgoing[0];
      if (current.type === "decision" && outgoing.length > 1) {
        const desired = age >= 18 ? /^(sí|si|yes|true)$/i : /^(no|false)$/i;
        next =
          outgoing.find((connection) =>
            desired.test(connection.label?.trim() ?? ""),
          ) ??
          outgoing[age >= 18 ? 0 : 1] ??
          outgoing[0];
      }
      current = next ? nodes.find((node) => node.id === next.to) : undefined;
    }
    return result;
  }, [nodes, connections, age]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step >= path.length - 1) setRunning(false);
      else setStep((v) => v + 1);
    }, 850 / speed);
    return () => clearTimeout(timer);
  }, [running, step, speed, path.length]);

  const rememberUndo = useCallback((snapshot: Snapshot) => {
    undoStack.current.push(snapshot);
    undoStack.current = undoStack.current.slice(-MAX_HISTORY);
  }, []);
  const rememberRedo = useCallback((snapshot: Snapshot) => {
    redoStack.current.push(snapshot);
    redoStack.current = redoStack.current.slice(-MAX_HISTORY);
  }, []);
  const commit = useCallback(
    (nextNodes: FlowNode[], nextConnections = connections, record = true) => {
      if (record) {
        rememberUndo({
          nodes: structuredClone(nodes),
          connections: structuredClone(connections),
        });
        redoStack.current = [];
        setHistoryState({ canUndo: true, canRedo: false });
      }
      onChange(nextNodes, nextConnections);
    },
    [connections, nodes, onChange, rememberUndo],
  );
  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    rememberRedo({
      nodes: structuredClone(nodes),
      connections: structuredClone(connections),
    });
    onChange(previous.nodes, previous.connections);
    setHistoryState({ canUndo: undoStack.current.length > 0, canRedo: true });
  }, [connections, nodes, onChange, rememberRedo]);
  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    rememberUndo({
      nodes: structuredClone(nodes),
      connections: structuredClone(connections),
    });
    onChange(next.nodes, next.connections);
    setHistoryState({ canUndo: true, canRedo: redoStack.current.length > 0 });
  }, [connections, nodes, onChange, rememberUndo]);
  const snap = (value: number) =>
    snapToGrid ? Math.round(value / gridSize) * gridSize : value;

  const addNode = (type: FlowNodeType) => {
    const id = `node-${crypto.randomUUID()}`;
    const column = nodes.length % 4;
    const row = Math.floor(nodes.length / 4);
    commit([
      ...nodes,
      {
        id,
        type,
        label: nodeMeta[type].label,
        x: snap(90 + column * 220),
        y: snap(80 + row * 120),
        width: type === "connector" ? 62 : 150,
        height: type === "connector" ? 62 : 52,
        fill: "#fffaf1",
        stroke: "#6f7f5a",
        strokeWidth: 2,
        zIndex: nodes.length,
      },
    ]);
    setSelected([id]);
  };
  const deleteSelection = useCallback(() => {
    if (selectedConnection) {
      commit(
        nodes,
        connections.filter((c) => c.id !== selectedConnection),
      );
      setSelectedConnection(null);
      return;
    }
    if (!selected.length) return;
    commit(
      nodes.filter((n) => !selected.includes(n.id)),
      connections.filter(
        (c) => !selected.includes(c.from) && !selected.includes(c.to),
      ),
    );
    setSelected([]);
  }, [commit, connections, nodes, selected, selectedConnection]);
  const copySelection = useCallback(() => {
    const chosen = new Set(selected);
    clipboard.current = {
      nodes: nodes
        .filter((node) => chosen.has(node.id))
        .map((node) => structuredClone(node)),
      connections: connections
        .filter(
          (connection) =>
            chosen.has(connection.from) && chosen.has(connection.to),
        )
        .map((connection) => structuredClone(connection)),
    };
  }, [connections, nodes, selected]);
  const paste = useCallback(() => {
    if (!clipboard.current.nodes.length) return;
    const idMap = new Map<string, string>();
    const pasted = clipboard.current.nodes.map((node) => {
      const id = `node-${crypto.randomUUID()}`;
      idMap.set(node.id, id);
      return {
        ...structuredClone(node),
        id,
        x: node.x + gridSize,
        y: node.y + gridSize,
        zIndex: nodes.length + (node.zIndex ?? 0),
      };
    });
    const pastedConnections = clipboard.current.connections.flatMap(
      (connection) => {
        const from = idMap.get(connection.from),
          to = idMap.get(connection.to);
        return from && to
          ? [
              {
                ...structuredClone(connection),
                id: `connection-${crypto.randomUUID()}`,
                from,
                to,
              },
            ]
          : [];
      },
    );
    commit([...nodes, ...pasted], [...connections, ...pastedConnections]);
    setSelected(pasted.map((node) => node.id));
  }, [commit, connections, gridSize, nodes]);
  const duplicate = useCallback(() => {
    const chosen = new Set(selected);
    if (!chosen.size) return;
    const idMap = new Map<string, string>();
    const pasted = nodes
      .filter((node) => chosen.has(node.id))
      .map((node) => {
        const id = `node-${crypto.randomUUID()}`;
        idMap.set(node.id, id);
        return {
          ...structuredClone(node),
          id,
          x: node.x + gridSize,
          y: node.y + gridSize,
          zIndex: nodes.length + (node.zIndex ?? 0),
        };
      });
    const pastedConnections = connections.flatMap((connection) => {
      const from = idMap.get(connection.from),
        to = idMap.get(connection.to);
      return from && to
        ? [
            {
              ...structuredClone(connection),
              id: `connection-${crypto.randomUUID()}`,
              from,
              to,
            },
          ]
        : [];
    });
    commit([...nodes, ...pasted], [...connections, ...pastedConnections]);
    setSelected(pasted.map((node) => node.id));
  }, [commit, connections, gridSize, nodes, selected]);
  const group = () => {
    if (selected.length < 2) return;
    const groupId = `group-${crypto.randomUUID()}`;
    commit(nodes.map((n) => (selected.includes(n.id) ? { ...n, groupId } : n)));
  };
  const ungroup = () =>
    commit(
      nodes.map((n) =>
        selected.includes(n.id) ? { ...n, groupId: undefined } : n,
      ),
    );
  const layer = (front: boolean) => {
    const bound = front
      ? Math.max(...nodes.map((n) => n.zIndex ?? 0), 0) + 1
      : Math.min(...nodes.map((n) => n.zIndex ?? 0), 0) - 1;
    commit(
      nodes.map((n) => (selected.includes(n.id) ? { ...n, zIndex: bound } : n)),
    );
  };
  const align = (axis: "x" | "y") => {
    const chosen = nodes.filter((n) => selected.includes(n.id));
    if (chosen.length < 2) return;
    const average =
      chosen.reduce((sum, n) => sum + (axis === "x" ? n.x : n.y), 0) /
      chosen.length;
    commit(
      nodes.map((n) =>
        selected.includes(n.id) ? { ...n, [axis]: snap(average) } : n,
      ),
    );
  };
  const distribute = (axis: "x" | "y") => {
    const chosen = nodes
      .filter((n) => selected.includes(n.id))
      .sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
    if (chosen.length < 3) return;
    const first = axis === "x" ? chosen[0].x : chosen[0].y,
      last = axis === "x" ? chosen.at(-1)!.x : chosen.at(-1)!.y,
      gap = (last - first) / (chosen.length - 1);
    const values = new Map(chosen.map((n, i) => [n.id, snap(first + gap * i)]));
    commit(
      nodes.map((n) =>
        values.has(n.id) ? { ...n, [axis]: values.get(n.id)! } : n,
      ),
    );
  };
  const patchSelected = (patch: Partial<FlowNode>, record = true) =>
    commit(
      nodes.map((n) => (selected.includes(n.id) ? { ...n, ...patch } : n)),
      connections,
      record,
    );
  const beginInspectorEdit = () => {
    if (!inspectorSnapshot.current)
      inspectorSnapshot.current = {
        nodes: structuredClone(nodes),
        connections: structuredClone(connections),
      };
  };
  const endInspectorEdit = () => {
    if (!inspectorSnapshot.current) return;
    rememberUndo(inspectorSnapshot.current);
    inspectorSnapshot.current = null;
    redoStack.current = [];
    setHistoryState({ canUndo: true, canRedo: false });
  };
  const connect = (to: string) => {
    if (!connectingFrom || connectingFrom === to) return;
    const exists = connections.some(
      (c) => c.from === connectingFrom && c.to === to,
    );
    if (!exists)
      commit(nodes, [
        ...connections,
        {
          id: `connection-${crypto.randomUUID()}`,
          from: connectingFrom,
          to,
          color: "#7b735f",
          width: 2,
        },
      ]);
    setConnectingFrom(null);
  };
  const exportSvg = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone
      .querySelectorAll(".selection-handle,.connection-handle,.selection-box")
      .forEach((el) => el.remove());
    const anchor = document.createElement("a");
    anchor.download = "diagrama-lumina.svg";
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml",
      }),
    );
    anchor.href = url;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input,textarea,[contenteditable=true]")) return;
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      } else if (mod && event.key.toLowerCase() === "c") copySelection();
      else if (mod && event.key.toLowerCase() === "x") {
        copySelection();
        deleteSelection();
      } else if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        paste();
      } else if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicate();
      } else if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (mod && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(nodes.map((n) => n.id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [copySelection, deleteSelection, duplicate, nodes, paste, redo, undo]);

  const orderedNodes = [...nodes].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  );
  return (
    <div
      className="flow-layout"
      data-can-undo={historyState.canUndo}
      data-can-redo={historyState.canRedo}
      style={
        {
          "--workspace-zoom": zoom / 100,
          "--flow-grid": `${gridSize}px`,
        } as React.CSSProperties
      }
    >
      <div className="node-palette">
        <div className="palette-title">Elementos</div>
        {(
          [
            "start",
            "process",
            "decision",
            "input",
            "output",
            "subprocess",
            "connector",
          ] as FlowNodeType[]
        ).map((type) => (
          <button key={type} onClick={() => addNode(type)}>
            {nodeMeta[type].icon}
            <span>{nodeMeta[type].label}</span>
            <Plus />
          </button>
        ))}
        <div className="palette-tip">
          Shift + clic selecciona varios. Arrastra sobre el fondo para selección
          por área.
        </div>
      </div>
      <div className="flow-main">
        <div className="visual-toolbar flow-tools">
          <strong>Diagrama</strong>
          <button disabled={!selected.length} onClick={duplicate}>
            <Copy /> Duplicar
          </button>
          <button
            disabled={!selected.length}
            onClick={() => setConnectingFrom(selected[0])}
            className={connectingFrom ? "active" : ""}
          >
            <Link2 /> Conectar
          </button>
          <button disabled={!selected.length} onClick={group}>
            <Group /> Agrupar
          </button>
          <button disabled={!selected.length} onClick={ungroup}>
            <Ungroup /> Desagrupar
          </button>
          <button
            disabled={!selected.length}
            onClick={() => layer(true)}
            title="Traer al frente"
          >
            <BringToFront />
          </button>
          <button
            disabled={!selected.length}
            onClick={() => layer(false)}
            title="Enviar atrás"
          >
            <SendToBack />
          </button>
          <button
            disabled={selected.length < 2}
            onClick={() => align("x")}
            title="Alinear verticalmente"
          >
            <AlignVerticalDistributeCenter />
          </button>
          <button
            disabled={selected.length < 2}
            onClick={() => align("y")}
            title="Alinear horizontalmente"
          >
            <AlignHorizontalDistributeCenter />
          </button>
          <button
            disabled={selected.length < 3}
            onClick={() => distribute("x")}
          >
            Distribuir H
          </button>
          <button
            disabled={selected.length < 3}
            onClick={() => distribute("y")}
          >
            Distribuir V
          </button>
          <button onClick={undo} disabled={!undoStack.current.length}>
            <Undo2 />
          </button>
          <button onClick={redo} disabled={!redoStack.current.length}>
            <Redo2 />
          </button>
          <button
            disabled={!selected.length && !selectedConnection}
            className="danger"
            onClick={deleteSelection}
          >
            <Trash2 />
          </button>
        </div>
        {selected.length === 1 && (
          <div className="flow-inspector">
            <label>
              Texto{" "}
              <input
                maxLength={500}
                value={nodes.find((n) => n.id === selected[0])?.label ?? ""}
                onFocus={beginInspectorEdit}
                onBlur={endInspectorEdit}
                onChange={(e) =>
                  patchSelected({ label: e.target.value }, false)
                }
              />
              <span className="flow-color-swatches" aria-label="Colores rápidos de relleno">
                {["#fffaf1", "#e1e7d7", "#f3d3c9", "#dce6ee", "#eadfce"].map((fill) => <button key={fill} type="button" title={fill} aria-label={`Relleno ${fill}`} className={selectedNode?.fill === fill ? "active" : ""} style={{ background: fill }} onClick={() => patchSelected({ fill })} />)}
              </span>
            </label>
            <label>
              Relleno{" "}
              <input
                type="color"
                value={
                  nodes.find((n) => n.id === selected[0])?.fill ?? "#fffaf1"
                }
                onFocus={beginInspectorEdit}
                onBlur={endInspectorEdit}
                onChange={(e) => patchSelected({ fill: e.target.value }, false)}
              />
            </label>
            <label>
              Borde{" "}
              <input
                type="color"
                value={
                  nodes.find((n) => n.id === selected[0])?.stroke ?? "#8c806f"
                }
                onFocus={beginInspectorEdit}
                onBlur={endInspectorEdit}
                onChange={(e) =>
                  patchSelected({ stroke: e.target.value }, false)
                }
              />
            </label>
            <label>
              Grosor{" "}
              <input
                type="range"
                min="1"
                max="8"
                value={
                  nodes.find((n) => n.id === selected[0])?.strokeWidth ?? 2
                }
                onFocus={beginInspectorEdit}
                onBlur={endInspectorEdit}
                onChange={(e) =>
                  patchSelected({ strokeWidth: Number(e.target.value) }, false)
                }
              />
            </label>
          </div>
        )}
        <div
          className="flow-canvas"
          role="application"
          aria-label="Lienzo del diagrama"
          tabIndex={0}
          onClick={(e) => e.currentTarget.focus()}
          onContextMenu={(e) => {
            e.preventDefault();
            setContext({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 220), kind: "canvas" });
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 1000 700"
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) * 1000) / rect.width,
                y = ((e.clientY - rect.top) * 700) / rect.height;
              selectionStart.current = { x, y };
              setSelectionBox({ x, y, width: 0, height: 0 });
              if (!e.shiftKey) {
                setSelected([]);
                setSelectedConnection(null);
              }
            }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - rect.left) * 1000) / rect.width,
                py = ((e.clientY - rect.top) * 700) / rect.height;
              if (dragRef.current) {
                const dx = px - dragRef.current.startX,
                  dy = py - dragRef.current.startY;
                onChange(
                  nodes.map((n) => {
                    const origin = dragRef.current?.origins.get(n.id);
                    return origin
                      ? { ...n, x: snap(origin.x + dx), y: snap(origin.y + dy) }
                      : n;
                  }),
                  connections,
                );
              } else if (selectionStart.current) {
                const x = Math.min(selectionStart.current.x, px),
                  y = Math.min(selectionStart.current.y, py);
                setSelectionBox({
                  x,
                  y,
                  width: Math.abs(px - selectionStart.current.x),
                  height: Math.abs(py - selectionStart.current.y),
                });
              }
            }}
            onPointerUp={() => {
              if (dragRef.current) {
                const origins = dragRef.current.origins;
                rememberUndo({
                  nodes: structuredClone(
                    nodes.map((node) =>
                      origins.has(node.id)
                        ? { ...node, ...origins.get(node.id)! }
                        : node,
                    ),
                  ),
                  connections: structuredClone(connections),
                });
                redoStack.current = [];
                setHistoryState({ canUndo: true, canRedo: false });
                dragRef.current = null;
              }
              if (selectionBox) {
                const hits = nodes
                  .filter((n) => {
                    const s = sizeOf(n);
                    return (
                      n.x >= selectionBox.x &&
                      n.y >= selectionBox.y &&
                      n.x + s.width <= selectionBox.x + selectionBox.width &&
                      n.y + s.height <= selectionBox.y + selectionBox.height
                    );
                  })
                  .map((n) => n.id);
                setSelected(hits);
              }
              selectionStart.current = null;
              setSelectionBox(null);
            }}
          >
            <defs>
              <marker
                id="arrow"
                markerWidth="9"
                markerHeight="9"
                refX="8"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="context-stroke" />
              </marker>
            </defs>
            {connections.map((c) => {
              const from = nodes.find((n) => n.id === c.from),
                to = nodes.find((n) => n.id === c.to);
              if (!from || !to) return null;
              const fs = sizeOf(from),
                ts = sizeOf(to);
              const x1 = from.x + fs.width / 2,
                y1 = from.y + fs.height,
                x2 = to.x + ts.width / 2,
                y2 = to.y;
              const midY = (y1 + y2) / 2;
              return (
                <g
                  key={c.id}
                  className={`flow-connection ${selectedConnection === c.id ? "selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnection(c.id);
                    setSelected([]);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedConnection(c.id);
                    setContext({
                      x: Math.min(e.clientX, window.innerWidth - 220),
                      y: Math.min(e.clientY, window.innerHeight - 300),
                      kind: "connection",
                    });
                  }}
                >
                  <path
                    className="connection-hit"
                    d={`M${x1} ${y1} C${x1} ${midY},${x2} ${midY},${x2} ${y2}`}
                  />
                  <path
                    d={`M${x1} ${y1} C${x1} ${midY},${x2} ${midY},${x2} ${y2}`}
                    fill="none"
                    stroke={c.color ?? "#7b735f"}
                    strokeWidth={c.width ?? 2}
                    strokeDasharray={c.dashed ? "8 6" : undefined}
                    markerEnd="url(#arrow)"
                  />
                  {c.label && (
                    <text x={(x1 + x2) / 2 + 8} y={midY - 5}>
                      {c.label}
                    </text>
                  )}
                </g>
              );
            })}
            {orderedNodes.map((node) => {
              const active = path[step] === node.id,
                chosen = selected.includes(node.id),
                s = sizeOf(node);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  className={`svg-node type-${node.type} ${active ? "executing" : ""} ${chosen ? "selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingFrom) {
                      connect(node.id);
                      return;
                    }
                    const groupIds = node.groupId
                      ? nodes
                          .filter((n) => n.groupId === node.groupId)
                          .map((n) => n.id)
                      : [node.id];
                    setSelected(e.shiftKey
                      ? groupIds.every((id) => selected.includes(id))
                        ? selected.filter((id) => !groupIds.includes(id))
                        : [...new Set([...selected, ...groupIds])]
                      : groupIds);
                    setSelectedConnection(null);
                  }}
                  onDoubleClick={() => {
                    setLabelDialog({ nodeId: node.id, value: node.label });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelected([node.id]);
                    setContext({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 300), kind: "node" });
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const rect =
                      e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                    const px = ((e.clientX - rect.left) * 1000) / rect.width,
                      py = ((e.clientY - rect.top) * 700) / rect.height;
                    const ids = selected.includes(node.id)
                      ? selected
                      : [node.id];
                    dragRef.current = {
                      startX: px,
                      startY: py,
                      origins: new Map(
                        nodes
                          .filter((n) => ids.includes(n.id))
                          .map((n) => [n.id, { x: n.x, y: n.y }]),
                      ),
                    };
                  }}
                >
                  {node.type === "decision" ? (
                    <polygon
                      points={`${s.width / 2},0 ${s.width},${s.height / 2} ${s.width / 2},${s.height} 0,${s.height / 2}`}
                      fill={node.fill}
                      stroke={node.stroke}
                      strokeWidth={node.strokeWidth}
                    />
                  ) : node.type === "connector" ? (
                    <ellipse
                      cx={s.width / 2}
                      cy={s.height / 2}
                      rx={s.width / 2 - 2}
                      ry={s.height / 2 - 2}
                      fill={node.fill}
                      stroke={node.stroke}
                      strokeWidth={node.strokeWidth}
                    />
                  ) : (
                    <rect
                      width={s.width}
                      height={s.height}
                      rx={
                        node.type === "start" || node.type === "end"
                          ? s.height / 2
                          : 10
                      }
                      fill={node.fill}
                      stroke={node.stroke}
                      strokeWidth={node.strokeWidth}
                    />
                  )}
                  {node.type === "subprocess" && (
                    <>
                      <line
                        x1="12"
                        y1="0"
                        x2="12"
                        y2={s.height}
                        stroke={node.stroke}
                      />
                      <line
                        x1={s.width - 12}
                        y1="0"
                        x2={s.width - 12}
                        y2={s.height}
                        stroke={node.stroke}
                      />
                    </>
                  )}
                  <text
                    x={s.width / 2}
                    y={s.height / 2 + 4}
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                  {chosen && (
                    <>
                      <rect
                        className="selection-outline"
                        x="-5"
                        y="-5"
                        width={s.width + 10}
                        height={s.height + 10}
                      />
                      <rect
                        className="selection-handle"
                        x={s.width - 5}
                        y={s.height - 5}
                        width="10"
                        height="10"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const svgBounds =
                            e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                          const start = {
                            x: e.clientX,
                            y: e.clientY,
                            width: s.width,
                            height: s.height,
                          };
                          const snapshot = { nodes: structuredClone(nodes), connections: structuredClone(connections) };
                          const move = (m: PointerEvent) =>
                            onChange(
                              nodes.map((n) =>
                                n.id === node.id
                                  ? {
                                      ...n,
                                      width: Math.max(
                                        50,
                                        snap(
                                          start.width +
                                            ((m.clientX - start.x) * 1000) /
                                              svgBounds.width,
                                        ),
                                      ),
                                      height: Math.max(
                                        36,
                                        snap(
                                          start.height +
                                            ((m.clientY - start.y) * 700) /
                                              svgBounds.height,
                                        ),
                                      ),
                                    }
                                  : n,
                              ),
                              connections,
                            );
                          const up = () => {
                            window.removeEventListener("pointermove", move);
                            window.removeEventListener("pointerup", up);
                            window.removeEventListener("pointercancel", up);
                            rememberUndo(snapshot);
                            redoStack.current = [];
                            setHistoryState({ canUndo: true, canRedo: false });
                          };
                          window.addEventListener("pointermove", move);
                          window.addEventListener("pointerup", up);
                          window.addEventListener("pointercancel", up);
                        }}
                      />
                    </>
                  )}
                </g>
              );
            })}
            {selectionBox && (
              <rect className="selection-box" {...selectionBox} />
            )}
          </svg>
        </div>
        <div className="simulation-strip">
          <strong>Simulador</strong>
          <button
            onClick={runSimulation}
          >
            <Play /> Ejecutar
          </button>
          <button onClick={() => setRunning(false)}>
            <Pause /> Pausar
          </button>
          <button
            onClick={() => setStep((v) => Math.min(path.length - 1, v + 1))}
          >
            <SkipForward /> Paso
          </button>
          <button
            onClick={() => {
              setRunning(false);
              setStep(-1);
            }}
          >
            <RotateCcw /> Reiniciar
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
          <button onClick={exportSvg}>
            <Download /> SVG
          </button>
        </div>
      </div>
      <aside className="simulation-panel">
        <div className="sim-status">
          <span className={running ? "pulse" : ""} />
          {running ? "Ejecutando" : step >= 0 ? "Pausado" : "Vista previa"}
        </div>
        <h3>Variables</h3>
        <label>
          edad
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          />
        </label>
        <div className="variable-row">
          <span>resultado</span>
          <code>{age >= 18 ? '"Mayor"' : '"Menor"'}</code>
        </div>
        <h3>Salida</h3>
        <pre>
          &gt;{" "}
          {age >= 18 ? "Usted es mayor de edad." : "Usted es menor de edad."}
        </pre>
        <button className="run-simulation" onClick={runSimulation}><Play /> Ejecutar diagrama</button>
        <h3>Selección</h3>
        <p>
          {selected.length
            ? `${selected.length} elemento(s)`
            : selectedConnection
              ? "1 conexión"
              : "Nada seleccionado"}
        </p>
      </aside>
      {context && (
        <div
          className="flow-context-menu"
          style={{ left: context.x, top: context.y }}
          onClick={() => setContext(null)}
        >
          {context.kind === "node" && (
            <>
              <button onClick={duplicate}>
                <Copy /> Duplicar
              </button>
              <button onClick={copySelection}>
                <Copy /> Copiar
              </button>
              <button onClick={() => setConnectingFrom(selected[0])}>
                <Link2 /> Conectar
              </button>
              <button onClick={() => layer(true)}>
                <BringToFront /> Traer al frente
              </button>
              <button onClick={() => layer(false)}>
                <SendToBack /> Enviar atrás
              </button>
              <button className="danger" onClick={deleteSelection}>
                <Trash2 /> Eliminar
              </button>
            </>
          )}
          {context.kind === "connection" && (
            <>
              <button
                onClick={() => {
                  const current = connections.find(
                    (c) => c.id === selectedConnection,
                  );
                  if (current)
                    commit(
                      nodes,
                      connections.map((c) =>
                        c.id === current.id
                          ? { ...c, from: current.to, to: current.from }
                          : c,
                      ),
                    );
                }}
              >
                Invertir dirección
              </button>
              <button
                onClick={() =>
                  commit(
                    nodes,
                    connections.map((c) =>
                      c.id === selectedConnection
                        ? { ...c, dashed: !c.dashed }
                        : c,
                    ),
                  )
                }
              >
                Alternar estilo
              </button>
              <button className="danger" onClick={deleteSelection}>
                <Trash2 /> Eliminar conexión
              </button>
            </>
          )}
          {context.kind === "canvas" && (
            <>
              <button onClick={paste}>
                <Clipboard /> Pegar
              </button>
              <button onClick={() => setSelected(nodes.map((n) => n.id))}>
                Seleccionar todo
              </button>
            </>
          )}
        </div>
      )}
      <TextInputDialog
        open={Boolean(labelDialog)}
        title="Editar figura"
        label="Texto de la figura"
        value={labelDialog?.value ?? ""}
        maxLength={500}
        confirmLabel="Guardar texto"
        onChange={(value) => setLabelDialog((current) => current ? { ...current, value } : current)}
        onCancel={() => setLabelDialog(null)}
        onConfirm={() => {
          if (!labelDialog) return;
          commit(nodes.map((node) =>
            node.id === labelDialog.nodeId
              ? { ...node, label: labelDialog.value.trim().slice(0, 500) || nodeMeta[node.type].label }
              : node,
          ));
          setLabelDialog(null);
        }}
      />
    </div>
  );
}
