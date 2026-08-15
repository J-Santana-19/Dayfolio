export type Theme = "light" | "dark";
export type TabKind = "document" | "drawing" | "flowchart";
export type WorkspaceFolder = "Diario" | "Universidad" | "Proyectos" | "Notas";
export type FolderNames = Record<WorkspaceFolder, string>;
export type FlowNodeType = "start" | "input" | "decision" | "process" | "output" | "subprocess" | "connector" | "end";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  zIndex?: number;
  groupId?: string;
}

export interface FlowConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
  color?: string;
  width?: number;
  dashed?: boolean;
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
  folder: WorkspaceFolder;
  tags: string[];
  favorite: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
  activeTabId: string;
  tabs: DocumentTab[];
  versions: VersionSnapshot[];
  journalDate?: string;
}

export interface WorkspaceState {
  workspaceName: string;
  folderNames: FolderNames;
  documents: WorkspaceDocument[];
  activeDocumentId: string;
  theme: Theme;
  accent: string;
  documentWidth: "compact" | "comfortable" | "wide";
  editorFont: "serif" | "sans" | "mono";
  fontSize: "small" | "medium" | "large";
  lineHeight: "compact" | "comfortable" | "relaxed";
  spellCheck: boolean;
  showToolbar: boolean;
  toolbarMode: "compact" | "expanded";
  workspaceZoom: number;
  snapToGrid: boolean;
  gridSize: number;
  reduceMotion: boolean;
}
