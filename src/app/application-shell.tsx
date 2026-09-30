"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { ApplicationShellState } from "@/server/application/application-context";
import type { ApplicationNavItem } from "./application-navigation";

function isActive(pathname: string, href: string) {
  const target = href.split("#")[0];
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function ApplicationShell({
  state,
  navigation,
  context,
  children
}: {
  state: ApplicationShellState;
  navigation: ApplicationNavItem[];
  context: "workspace" | "creator";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  async function switchWorkspace(workspaceId: string) {
    const response = await fetch("/api/workspaces/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId })
    });
    if (!response.ok) return;
    router.push("/");
    router.refresh();
  }

  function closeNavigation() {
    setMobileOpen(false);
  }

  const groups = ["Visão geral", "Operação", "Recursos", "Organização"] as const;
  const nav = (
    <nav className="primary-navigation" aria-label="Navegação principal">
      {groups.map((group) => {
        const items = navigation.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <div className="nav-group" key={group}>
            <p className="nav-group-label">{group}</p>
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={active ? "nav-link active" : "nav-link"}
                  aria-current={active ? "page" : undefined}
                  onClick={closeNavigation}
                >
                  <span>{item.label}</span>
                  {active ? <span className="nav-current" aria-hidden="true">●</span> : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="product-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <aside className="desktop-sidebar" aria-label="LANDER CREATORS">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">LC</span>
          <span><strong>LANDER</strong><small>CREATORS</small></span>
        </Link>
        {nav}
        <div className="sidebar-footer">
          <span className="muted-label">Contexto</span>
          <strong>{context === "creator" ? state.creator?.displayName ?? "Creator" : state.activeWorkspace?.name ?? "Sem workspace"}</strong>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="mobile-nav-layer" role="presentation">
          <button className="mobile-nav-backdrop" aria-label="Fechar navegação" onClick={() => { setMobileOpen(false); triggerRef.current?.focus(); }} />
          <aside className="mobile-sidebar" aria-label="Navegação móvel">
            <div className="mobile-nav-heading">
              <strong>LANDER CREATORS</strong>
              <button ref={closeRef} type="button" onClick={() => { setMobileOpen(false); triggerRef.current?.focus(); }}>Fechar</button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="product-workspace">
        <header className="product-header">
          <button
            ref={triggerRef}
            className="mobile-nav-trigger"
            type="button"
            aria-label="Abrir navegação"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            Menu
          </button>

          <div className="context-controls" aria-label="Contexto ativo">
            {state.activeWorkspace ? (
              <button
                type="button"
                className={context === "workspace" ? "context-chip active" : "context-chip"}
                aria-pressed={context === "workspace"}
                onClick={() => router.push("/")}
              >
                Workspace: {state.activeWorkspace.name}
              </button>
            ) : null}
            <button
              type="button"
              className={context === "creator" ? "context-chip active" : "context-chip"}
              aria-pressed={context === "creator"}
              onClick={() => router.push("/creator")}
            >
              Creator: {state.creator?.displayName ?? "Meu perfil"}
            </button>
            {context === "workspace" && state.workspaces.length > 1 ? (
              <label className="workspace-switcher">
                <span>Trocar workspace</span>
                <select
                  value={state.activeWorkspace?.id ?? ""}
                  onChange={(event) => void switchWorkspace(event.target.value)}
                >
                  {state.workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="user-controls">
            <span>{state.user.name}</span>
            <button type="button" className="secondary-button" onClick={async () => {
              await authClient.signOut();
              router.push("/");
              router.refresh();
            }}>Sair</button>
          </div>
        </header>

        <main id="main-content" className="product-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
