"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { Icon } from "./icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible mobile navigation drawer: role=dialog, focus trap, Escape close, scroll lock, focus return. */
export function MobileNav({
  open,
  onClose,
  label,
  triggerRef,
  children
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div className="lc-mobile-nav-layer" role="presentation">
      <div className="lc-mobile-nav-backdrop" aria-hidden="true" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} className="lc-mobile-nav-panel">
        <div className="lc-mobile-nav-heading">
          <strong>{label}</strong>
          <button ref={closeRef} type="button" className="lc-button lc-button--icon" aria-label="Fechar navegação" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
