"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDocument, createInitialState, createTab, uid } from "@/src/database/initial-data";
import { loadWorkspace, saveWorkspace } from "@/src/database/storage";
import type { DocumentTab, TabKind, WorkspaceDocument, WorkspaceState } from "@/src/types/workspace";

export type SaveStatus = "saved" | "saving" | "error";

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(() => createInitialState());
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const skipFirstSave = useRef(true);

  useEffect(() => {
    loadWorkspace().then((stored) => {
      if (stored?.documents?.length) setState(stored);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      saveWorkspace(state).then(() => setSaveStatus("saved")).catch(() => setSaveStatus("error"));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state, ready]);

  const activeDocument = useMemo(() => state.documents.find((doc) => doc.id === state.activeDocumentId) ?? state.documents[0], [state]);
  const activeTab = useMemo(() => activeDocument?.tabs.find((tab) => tab.id === activeDocument.activeTabId) ?? activeDocument?.tabs[0], [activeDocument]);

  const patchDocument = useCallback((id: string, updater: (doc: WorkspaceDocument) => WorkspaceDocument) => {
    setState((current) => ({ ...current, documents: current.documents.map((doc) => doc.id === id ? updater(doc) : doc) }));
  }, []);

  const updateActiveTab = useCallback((patch: Partial<DocumentTab>) => {
    if (!activeDocument || !activeTab) return;
    patchDocument(activeDocument.id, (doc) => ({ ...doc, updatedAt: Date.now(), tabs: doc.tabs.map((tab) => tab.id === activeTab.id ? { ...tab, ...patch } : tab) }));
  }, [activeDocument, activeTab, patchDocument]);

  const addDocument = useCallback((folder?: string) => {
    const doc = createDocument("Nota sin título", folder);
    setState((current) => ({ ...current, documents: [...current.documents, doc], activeDocumentId: doc.id }));
    return doc;
  }, []);

  const createDailyNote = useCallback(() => {
    const title = new Intl.DateTimeFormat("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const existing = state.documents.find((doc) => doc.folder === "Diario" && doc.title.toLowerCase() === title.toLowerCase());
    if (existing) { setState((current) => ({ ...current, activeDocumentId: existing.id })); return; }
    const doc = createDocument(title.charAt(0).toUpperCase() + title.slice(1), "Diario");
    doc.emoji = "☀";
    doc.tabs[0].content = `<p class="eyebrow">DIARIO · HOY</p><h1>${doc.title}</h1><h2>¿Qué hice hoy?</h2><p>Empieza a escribir…</p><h2>¿Qué aprendí?</h2><p><br></p><h2>Pendientes</h2><ul><li><br></li></ul>`;
    setState((current) => ({ ...current, documents: [...current.documents, doc], activeDocumentId: doc.id }));
  }, [state.documents]);

  const addTab = useCallback((kind: TabKind) => {
    if (!activeDocument) return;
    const tab = createTab(kind);
    patchDocument(activeDocument.id, (doc) => ({ ...doc, activeTabId: tab.id, tabs: [...doc.tabs, tab], updatedAt: Date.now() }));
  }, [activeDocument, patchDocument]);

  const deleteTab = useCallback((tabId: string) => {
    if (!activeDocument || activeDocument.tabs.length === 1) return;
    patchDocument(activeDocument.id, (doc) => {
      const tabs = doc.tabs.filter((tab) => tab.id !== tabId);
      return { ...doc, tabs, activeTabId: doc.activeTabId === tabId ? tabs[0].id : doc.activeTabId, updatedAt: Date.now() };
    });
  }, [activeDocument, patchDocument]);

  const saveVersion = useCallback((label = "Versión manual") => {
    if (!activeDocument) return;
    patchDocument(activeDocument.id, (doc) => ({ ...doc, versions: [{ id: uid("version"), createdAt: Date.now(), label, tabs: structuredClone(doc.tabs) }, ...doc.versions].slice(0, 12) }));
  }, [activeDocument, patchDocument]);

  const restoreVersion = useCallback((versionId: string) => {
    if (!activeDocument) return;
    const version = activeDocument.versions.find((item) => item.id === versionId);
    if (!version) return;
    patchDocument(activeDocument.id, (doc) => ({ ...doc, tabs: structuredClone(version.tabs), activeTabId: version.tabs[0]?.id ?? doc.activeTabId, updatedAt: Date.now() }));
  }, [activeDocument, patchDocument]);

  return { state, setState, ready, saveStatus, activeDocument, activeTab, patchDocument, updateActiveTab, addDocument, createDailyNote, addTab, deleteTab, saveVersion, restoreVersion };
}
