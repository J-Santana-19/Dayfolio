"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface TextInputDialogProps {
  open: boolean;
  title: string;
  label: string;
  value: string;
  confirmLabel?: string;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TextInputDialog({
  open,
  title,
  label,
  value,
  confirmLabel = "Aceptar",
  placeholder,
  maxLength = 500,
  error,
  onChange,
  onCancel,
  onConfirm,
}: TextInputDialogProps) {
  const titleId = useId();
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop inline-dialog-backdrop">
      <button
        type="button"
        className="dialog-dismiss-layer"
        aria-label="Cerrar diálogo"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        className="text-input-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <div>
            <span>EDICIÓN</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Cerrar" onClick={onCancel}>
            <X />
          </button>
        </header>
        <label id={labelId} htmlFor={`${labelId}-input`}>{label}</label>
        <input
          ref={inputRef}
          id={`${labelId}-input`}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${labelId}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onConfirm();
            }
          }}
        />
        {error && <p id={`${labelId}-error`} role="alert">{error}</p>}
        <footer>
          <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
          <button type="button" className="primary-button" onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
