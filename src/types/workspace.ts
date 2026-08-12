export type Theme = "light" | "dark";
export type TabKind = "document" | "drawing" | "flowchart";
export type FlowNodeType = "start" | "input" | "decision" | "process" | "output" | "end";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
}

export interface FlowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface DocumentTab {
  id: string;
  title: string;
  icon: string;
  color: string;
  kind: TabKind;
  content: string;
  drawingData?: string;
  flowNodes?: FlowNode[];
  flowConnections?: FlowConnection[];
}

export interface VersionSnapshot {
  id: string;
  createdAt: number;
  label: string;
  tabs: DocumentTab[];
}

export interface WorkspaceDocument {
  id: string;
  title: string;
  emoji: string;
  folder: string;
  tags: string[];
  favorite: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
  activeTabId: string;
  tabs: DocumentTab[];
  versions: VersionSnapshot[];
}

export interface WorkspaceState {
  workspaceName: string;
  documents: WorkspaceDocument[];
  activeDocumentId: string;
  theme: Theme;
  accent: string;
  documentWidth: "compact" | "comfortable" | "wide";
}

