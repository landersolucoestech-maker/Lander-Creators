"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { ApplicationShellState } from "@/server/application/application-context";
import type { ApplicationNavItem } from "./application-navigation";
import { Icon } from "./ui/icons";
import { MobileNav } from "./ui/mobile-nav";
import { PageContainer } from "./ui/page-container";
import { Sidebar } from "./ui/sidebar";
import { Topbar } from "./ui/topbar";

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

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const contextLabel =
    context === "creator" ? state.creator?.displayName ?? "Creator" : state.activeWorkspace?.name ?? "Sem workspace";

  const sidebarContent = (
    <Sidebar
      navigation={navigation}
      pathname={pathname}
      contextLabel={contextLabel}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  const initials = state.user.name.trim().slice(0, 1).toUpperCase() || "U";

  const accountMenu = (
    <details className="lc-account-menu">
      <summary>
        <span className="lc-avatar" aria-hidden="true">{initials}</span>
        <span className="lc-account-name">{state.user.name}</span>
        <Icon name="chevron-down" />
      </summary>
      <div className="lc-account-menu-panel">
        {context === "workspace" && state.workspaces.length > 1 ? (
          <label className="lc-workspace-switcher">
            <span>Trocar workspace</span>
            <select value={state.activeWorkspace?.id ?? ""} onChange={(event) => void switchWorkspace(event.target.value)}>
              {state.workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="lc-account-menu-item" onClick={() => void signOut()}>Sair</button>
      </div>
    </details>
  );

  const contextSwitcher = (
    <div className="lc-context-switcher" aria-label="Contexto ativo">
      {state.activeWorkspace ? (
        <button
          type="button"
          className={context === "workspace" ? "lc-context-chip lc-context-chip--active" : "lc-context-chip"}
          aria-pressed={context === "workspace"}
          onClick={() => router.push("/")}
        >
          {state.activeWorkspace.name}
        </button>
      ) : null}
      <button
        type="button"
        className={context === "creator" ? "lc-context-chip lc-context-chip--active" : "lc-context-chip"}
        aria-pressed={context === "creator"}
        onClick={() => router.push("/creator")}
      >
        {state.creator?.displayName ?? "Meu perfil"}
      </button>
    </div>
  );

  return (
    <div className="lc-shell lc-surface">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>

      <aside className="lc-desktop-sidebar" aria-label="LANDER CREATORS">
        {sidebarContent}
      </aside>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} label="Navegação" triggerRef={triggerRef}>
        {sidebarContent}
      </MobileNav>

      <div className="lc-shell-main">
        <Topbar
          mobileNavTrigger={
            <button
              ref={triggerRef}
              type="button"
              className="lc-button lc-button--icon lc-mobile-nav-trigger"
              aria-label="Abrir navegação"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" />
            </button>
          }
          contextSwitcher={contextSwitcher}
          accountMenu={accountMenu}
        />
        <main id="main-content" className="lc-main-content" tabIndex={-1}>
          <PageContainer>{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
