import type { ApplicationShellState } from "@/server/application/application-context";

export type ApplicationNavItem = {
  id: string;
  label: string;
  href: string;
  group: "Visão geral" | "Operação" | "Recursos" | "Organização";
};

export function workspaceNavigation(state: ApplicationShellState): ApplicationNavItem[] {
  const items: ApplicationNavItem[] = [];
  if (state.capabilities.workspace) {
    items.push({ id: "dashboard", label: "Dashboard", href: "/", group: "Visão geral" });
  }
  items.push({ id: "creators", label: "Creators", href: "/creator", group: "Operação" });
  if (state.capabilities.music) {
    items.push({ id: "artists", label: "Artistas", href: "/music-catalog#artists", group: "Operação" });
    items.push({ id: "music", label: "Catálogo musical", href: "/music-catalog", group: "Operação" });
  }
  if (state.capabilities.campaign) {
    items.push({ id: "campaigns", label: "Campanhas", href: "/campaigns", group: "Operação" });
  }
  if (state.capabilities.promoted) {
    items.push({ id: "promoted", label: "Entidades promovidas", href: "/promoted-entities", group: "Operação" });
  }
  if (state.capabilities.media) {
    items.push({ id: "media", label: "Mídia", href: "/media", group: "Recursos" });
  }
  if (state.capabilities.team) {
    items.push({ id: "team", label: "Equipe", href: "/team", group: "Organização" });
  }
  if (state.capabilities.workspace) {
    items.push({ id: "workspace", label: "Workspace", href: "/workspace", group: "Organização" });
    items.push({ id: "settings", label: "Configurações", href: "/settings", group: "Organização" });
  }
  return items;
}

export function creatorNavigation(): ApplicationNavItem[] {
  return [
    { id: "creator", label: "Meu perfil", href: "/creator", group: "Visão geral" },
    { id: "opportunities", label: "Oportunidades", href: "/opportunities", group: "Operação" },
    { id: "proposals", label: "Propostas", href: "/proposals", group: "Operação" },
    { id: "contracts", label: "Contratos", href: "/contracts", group: "Operação" },
    { id: "deliverables", label: "Entregas", href: "/deliverables", group: "Operação" },
    { id: "payments", label: "Pagamentos", href: "/payments", group: "Operação" }
  ];
}
