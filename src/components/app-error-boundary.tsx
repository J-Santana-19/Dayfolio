"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("La aplicación encontró un error no recuperable.", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="fatal-error" role="alert">
        <span aria-hidden="true">❧</span>
        <h1>No pudimos abrir esta parte de tu diario</h1>
        <p>Tus datos permanecen guardados en este dispositivo. Recarga la aplicación para intentarlo nuevamente.</p>
        <button onClick={() => window.location.reload()}>Recargar aplicación</button>
      </main>
    );
  }
}
