"use client";

import { useRef, useState } from "react";
import { ApplicationShell } from "../../application-shell";
import { creatorNavigation, workspaceNavigation } from "../../application-navigation";
import { MobileNav } from "../../ui/mobile-nav";
import { Sidebar } from "../../ui/sidebar";
import type { ApplicationShellState } from "@/server/application/application-context";
import { noCapabilities } from "@/server/application/application-context";

const WORKSPACE_FIXTURE_STATE: ApplicationShellState = {
  user: { id: "dev-user", name: "Ana Dev Preview", email: "ana@dev.test" },
  workspaces: [
    { id: "w1", name: "LANDER Agência", type: "AGENCY", status: "ACTIVE", role_code: "OWNER", active: true },
    { id: "w2", name: "LANDER Label", type: "LABEL", status: "ACTIVE", role_code: "VIEWER", active: false }
  ],
  activeWorkspace: { id: "w1", name: "LANDER Agência", type: "AGENCY", status: "ACTIVE", role_code: "OWNER", active: true },
  creator: null,
  capabilities: {
    ...noCapabilities(),
    workspace: true,
    team: true,
    media: true,
    music: true,
    promoted: true,
    campaign: true,
    negotiations: true,
    engagements: true,
    contentReview: true,
    publications: true,
    finance: true,
    analytics: true,
    matching: true,
    disputes: true
  }
};

const CREATOR_FIXTURE_STATE: ApplicationShellState = {
  ...WORKSPACE_FIXTURE_STATE,
  activeWorkspace: null,
  creator: { id: "dev-creator", displayName: "Ana Creator Preview" }
};

function MobileDrawerPreview() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ padding: 16 }}>
      <button ref={triggerRef} type="button" className="lc-button lc-button--primary" onClick={() => setOpen(true)}>
        Abrir navegação móvel
      </button>
      <MobileNav open={open} onClose={() => setOpen(false)} label="Navegação" triggerRef={triggerRef}>
        <Sidebar
          navigation={workspaceNavigation(WORKSPACE_FIXTURE_STATE)}
          pathname="/campaigns"
          contextLabel={WORKSPACE_FIXTURE_STATE.activeWorkspace!.name}
          onNavigate={() => setOpen(false)}
        />
      </MobileNav>
    </div>
  );
}

/**
 * Dev-only fixture: Workspace shell, Creator shell, and the mobile drawer in
 * isolation (role=dialog/focus-trap/Escape/backdrop are inspectable here
 * regardless of real viewport width — the trigger visibility itself is
 * viewport-gated by CSS, so resize the browser to see the real breakpoint).
 */
export function ShellPreview() {
  return (
    <div style={{ display: "grid", gap: 48 }}>
      <section>
        <h2 style={{ padding: 16 }}>Workspace Shell</h2>
        <ApplicationShell state={WORKSPACE_FIXTURE_STATE} navigation={workspaceNavigation(WORKSPACE_FIXTURE_STATE)} context="workspace">
          <div style={{ padding: 16 }}>Conteúdo de página (fixture) — Workspace</div>
        </ApplicationShell>
      </section>

      <section>
        <h2 style={{ padding: 16 }}>Creator Shell</h2>
        <ApplicationShell state={CREATOR_FIXTURE_STATE} navigation={creatorNavigation()} context="creator">
          <div style={{ padding: 16 }}>Conteúdo de página (fixture) — Creator</div>
        </ApplicationShell>
      </section>

      <section>
        <h2 style={{ padding: 16 }}>Mobile navigation drawer (isolated)</h2>
        <MobileDrawerPreview />
      </section>
    </div>
  );
}
