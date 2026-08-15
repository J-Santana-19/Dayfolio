"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDocument,
  createInitialState,
  createTab,
  uid,
} from "@/src/database/initial-data";
import { loadWorkspace, saveWorkspace, WorkspaceConflictError } from "@/src/database/storage";
import { normalizeWorkspaceState } from "@/src/database/validation";
import { localDateKey } from "@/src/core/workspace-rules";
import type {
  DocumentTab,
  TabKind,
  WorkspaceDocument,
  WorkspaceFolder,
  WorkspaceState,
} from "@/src/types/workspace";

export type SaveStatus = "saved" | "saving" | "error" | "conflict";

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(() =>
    createInitialState(),
  );
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveMessage, setSaveMessage] = useState("");
  const skipFirstSave = useRef(true);
  const skipNextPersist = useRef(false);
  const dirty = useRef(false);
  const latestState = useRef(state);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const storedRevision = useRef(0);
  const writerId = useRef(uid("writer"));
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    latestState.current = state;
  }, [state]);

  useEffect(() => {
    loadWorkspace()
      .then((stored) => {
        if (stored) {
          storedRevision.current = stored.revision;
          setState(normalizeWorkspaceState(stored.state));
        }
        setReady(true);
      })
      .catch((error: unknown) => {
        setSaveStatus("error");
        setSaveMessage(error instanceof Error ? error.message : "No fue posible abrir el almacenamiento local.");
        setReady(true);
      });
  }, []);

  const persist = useCallback((snapshot: WorkspaceState, force = false) => {
    const revision = ++saveRevision.current;
    setSaveStatus("saving");
    setSaveMessage("");
    const operation = saveChain.current
      .catch(() => undefined)
      .then(async () => {
        const record = await saveWorkspace(snapshot, writerId.current, storedRevision.current, force);
        storedRevision.current = record.revision;
        channelRef.current?.postMessage({ writerId: writerId.current, revision: record.revision });
      });
    saveChain.current = operation.then(() => undefined);
    operation
      .then(() => {
        if (revision === saveRevision.current) {
          dirty.current = false;
          setSaveStatus("saved");
        }
      })
      .catch((error: unknown) => {
        if (revision !== saveRevision.current) return;
        if (error instanceof WorkspaceConflictError) {
          setSaveStatus("conflict");
          setSaveMessage("Otra pestaña guardó una versión más reciente. Tus cambios siguen abiertos aquí.");
          return;
        }
        setSaveStatus("error");
        const isQuota = error instanceof DOMException && error.name === "QuotaExceededError";
        setSaveMessage(isQuota ? "El dispositivo se quedó sin espacio. Exporta una copia y elimina imágenes pesadas." : error instanceof Error ? error.message : "No fue posible guardar los cambios.");
      });
    return operation;
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      dirty.current = false;
      return;
    }
    dirty.current = true;
    const timer = window.setTimeout(() => {
      void persist(state);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state, ready, persist]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      if (document.visibilityState === "hidden" && dirty.current)
        void persist(latestState.current);
    };
    const pageHide = () => {
      if (dirty.current) void persist(latestState.current);
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", pageHide);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", pageHide);
    };
  }, [ready, persist]);

  useEffect(() => {
    if (!ready || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("lumina-workspace-sync");
    channelRef.current = channel;
    channel.onmessage = async (event: MessageEvent<{ writerId?: string; revision?: number }>) => {
      if (event.data?.writerId === writerId.current) return;
      if ((event.data?.revision ?? 0) <= storedRevision.current) return;
      if (dirty.current) {
        setSaveStatus("conflict");
        setSaveMessage("Hay cambios nuevos en otra pestaña. Resuelve el conflicto antes de continuar guardando.");
        return;
      }
      try {
        const stored = await loadWorkspace();
        if (!stored || stored.revision <= storedRevision.current) return;
        storedRevision.current = stored.revision;
        skipNextPersist.current = true;
        setState(normalizeWorkspaceState(stored.state));
        setSaveStatus("saved");
        setSaveMessage("");
      } catch {
        setSaveStatus("error");
        setSaveMessage("No fue posible sincronizar los cambios de la otra pestaña.");
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [ready]);

  const activeDocument = useMemo(
    () =>
      state.documents.find((doc) => doc.id === state.activeDocumentId) ??
      state.documents.find((doc) => !doc.trashed) ??
      state.documents[0],
    [state],
  );
  const activeTab = useMemo(
    () =>
      activeDocument?.tabs.find(
        (tab) => tab.id === activeDocument.activeTabId,
      ) ?? activeDocument?.tabs[0],
    [activeDocument],
  );

  const patchDocument = useCallback(
    (id: string, updater: (doc: WorkspaceDocument) => WorkspaceDocument) => {
      setState((current) => ({
        ...current,
        documents: current.documents.map((doc) =>
          doc.id === id ? updater(doc) : doc,
        ),
      }));
    },
    [],
  );

  const updateActiveTab = useCallback(
    (patch: Partial<DocumentTab>) => {
      if (!activeDocument || !activeTab) return;
      patchDocument(activeDocument.id, (doc) => ({
        ...doc,
        updatedAt: Date.now(),
        tabs: doc.tabs.map((tab) =>
          tab.id === activeTab.id ? { ...tab, ...patch } : tab,
        ),
      }));
    },
    [activeDocument, activeTab, patchDocument],
  );

  const addDocument = useCallback((folder?: WorkspaceFolder) => {
    const doc = createDocument("Nota sin título", folder);
    setState((current) => ({
      ...current,
      documents: [...current.documents, doc],
      activeDocumentId: doc.id,
    }));
    return doc;
  }, []);

  const createDailyNoteForDate = useCallback((dateKey: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime()) || localDateKey(date) !== dateKey) return;
    const title = new Intl.DateTimeFormat("es-PA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    setState((current) => {
      const existing = current.documents.find(
        (doc) =>
          doc.folder === "Diario" &&
          (doc.journalDate === dateKey ||
            doc.title.toLowerCase() === title.toLowerCase()),
      );
      if (existing) return { ...current, activeDocumentId: existing.id };
      const doc = createDocument(
        title.charAt(0).toUpperCase() + title.slice(1),
        "Diario",
      );
      doc.emoji = "☀";
      doc.journalDate = dateKey;
      doc.createdAt = date.getTime();
      doc.updatedAt = date.getTime();
      doc.tabs[0].content = `<p class="eyebrow">MI DIARIO · ${dateKey}</p><h1>${doc.title}</h1><p class="lead">Un espacio íntimo para recordar tu día.</p><h2>Resumen del día</h2><p>Empieza a escribir…</p><h2>Gratitud</h2><ul><li><br></li></ul><h2>Pendientes</h2><ul><li><br></li></ul>`;
      return {
        ...current,
        documents: [...current.documents, doc],
        activeDocumentId: doc.id,
      };
    });
  }, []);

  const createDailyNote = useCallback(
    () => createDailyNoteForDate(localDateKey(new Date())),
    [createDailyNoteForDate],
  );

  const addTab = useCallback(
    (kind: TabKind) => {
      if (!activeDocument) return;
      const tab = createTab(kind);
      patchDocument(activeDocument.id, (doc) => ({
        ...doc,
        activeTabId: tab.id,
        tabs: [...doc.tabs, tab],
        updatedAt: Date.now(),
      }));
    },
    [activeDocument, patchDocument],
  );

  const deleteTab = useCallback(
    (tabId: string) => {
      if (!activeDocument || activeDocument.tabs.length === 1) return;
      patchDocument(activeDocument.id, (doc) => {
        const tabs = doc.tabs.filter((tab) => tab.id !== tabId);
        return {
          ...doc,
          tabs,
          activeTabId: doc.activeTabId === tabId ? tabs[0].id : doc.activeTabId,
          updatedAt: Date.now(),
        };
      });
    },
    [activeDocument, patchDocument],
  );

  const saveVersion = useCallback(
    (label = "Versión manual") => {
      if (!activeDocument) return;
      patchDocument(activeDocument.id, (doc) => ({
        ...doc,
        versions: [
          {
            id: uid("version"),
            createdAt: Date.now(),
            label,
            tabs: structuredClone(doc.tabs),
          },
          ...doc.versions,
        ].slice(0, 12),
      }));
    },
    [activeDocument, patchDocument],
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      if (!activeDocument) return;
      const version = activeDocument.versions.find(
        (item) => item.id === versionId,
      );
      if (!version) return;
      patchDocument(activeDocument.id, (doc) => ({
        ...doc,
        tabs: structuredClone(version.tabs),
        activeTabId: version.tabs[0]?.id ?? doc.activeTabId,
        updatedAt: Date.now(),
      }));
    },
    [activeDocument, patchDocument],
  );

  const retrySave = useCallback(() => {
    if (saveStatus === "conflict") {
      const keepLocal = window.confirm("Otra pestaña guardó cambios más recientes. ¿Quieres conservar esta pestaña y reemplazar la otra versión?");
      if (!keepLocal) return;
      void persist(latestState.current, true);
      return;
    }
    void persist(latestState.current);
  }, [persist, saveStatus]);
  return {
    state,
    setState,
    ready,
    saveStatus,
    saveMessage,
    retrySave,
    activeDocument,
    activeTab,
    patchDocument,
    updateActiveTab,
    addDocument,
    createDailyNote,
    createDailyNoteForDate,
    addTab,
    deleteTab,
    saveVersion,
    restoreVersion,
  };
}
