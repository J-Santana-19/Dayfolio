import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { AppErrorBoundary } from "@/src/components/app-error-boundary";
import { WorkspaceApp } from "@/src/components/workspace-app";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No se encontró el contenedor principal de Dayfolio.");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <WorkspaceApp />
    </AppErrorBoundary>
  </StrictMode>,
);
