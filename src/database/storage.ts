import type { WorkspaceState } from "@/src/types/workspace";

const DB_NAME = "lumina-workspace";
const STORE_NAME = "workspace";
const STATE_KEY = "primary";
const DB_VERSION = 2;
export const WORKSPACE_SCHEMA_VERSION = 2;

export interface StoredWorkspaceRecord {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
  writerId: string;
  state: WorkspaceState;
}

export class WorkspaceConflictError extends Error {
  constructor(public readonly remoteRevision: number) {
    super("Otra pestaña guardó cambios más recientes.");
    this.name = "WorkspaceConflictError";
  }
}

function isStoredRecord(value: unknown): value is StoredWorkspaceRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredWorkspaceRecord>;
  return typeof record.schemaVersion === "number" && typeof record.revision === "number" && typeof record.updatedAt === "number" && typeof record.writerId === "string" && !!record.state && typeof record.state === "object";
}

function asStoredRecord(value: unknown): StoredWorkspaceRecord | null {
  if (!value) return null;
  if (isStoredRecord(value)) return value;
  return { schemaVersion: 1, revision: 0, updatedAt: 0, writerId: "legacy", state: value as WorkspaceState };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("La base de datos local está bloqueada por otra pestaña."));
  });
}

export async function loadWorkspace(): Promise<StoredWorkspaceRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(asStoredRecord(request.result));
    request.onerror = () => { db.close(); reject(request.error); };
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
  });
}

export async function saveWorkspace(state: WorkspaceState, writerId: string, baseRevision: number, force = false): Promise<StoredWorkspaceRecord> {
  if (typeof indexedDB === "undefined") throw new Error("El almacenamiento local no está disponible.");
  const db = await openDatabase();
  return new Promise<StoredWorkspaceRecord>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);
    let nextRecord: StoredWorkspaceRecord | null = null;
    request.onsuccess = () => {
      const current = asStoredRecord(request.result);
      if (!force && current && current.writerId !== writerId && current.revision > baseRevision) {
        transaction.abort();
        reject(new WorkspaceConflictError(current.revision));
        return;
      }
      nextRecord = { schemaVersion: WORKSPACE_SCHEMA_VERSION, revision: Math.max(baseRevision, current?.revision ?? 0) + 1, updatedAt: Date.now(), writerId, state };
      store.put(nextRecord, STATE_KEY);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      if (nextRecord) resolve(nextRecord);
      else reject(new Error("No fue posible preparar el guardado local."));
    };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("No fue posible guardar los cambios.")); };
    transaction.onabort = () => db.close();
  });
}
