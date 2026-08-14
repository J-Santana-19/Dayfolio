import type { WorkspaceState } from "@/src/types/workspace";

const DB_NAME = "lumina-workspace";
const STORE_NAME = "workspace";
const STATE_KEY = "primary";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("La base de datos local está bloqueada por otra pestaña."));
  });
}

export async function loadWorkspace(): Promise<unknown | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => { db.close(); reject(request.error); };
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
  });
}

export async function saveWorkspace(state: WorkspaceState): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("El guardado local fue cancelado.")); };
  });
  db.close();
}
