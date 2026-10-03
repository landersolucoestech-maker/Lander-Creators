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
  if (state.capabilities.negotiations) {
    items.push({ id: "negotiations", label: "Negociações", href: "/negotiations", group: "Operação" });
  }
  if (state.capabilities.engagements) {
    items.push({ id: "engagements", label: "Contratações", href: "/engagements", group: "Operação" });
    items.push({ id: "engagement-contracts", label: "Contratos", href: "/engagements/contracts", group: "Operação" });
  }
  if (state.capabilities.contentReview) {
    items.push({ id: "content-review", label: "Revisão de conteúdo", href: "/content-review", group: "Operação" });
  }
  if (state.capabilities.publications) {
    items.push({ id: "publications", label: "Publicações", href: "/publications", group: "Operação" });
  }
  if (state.capabilities.finance) {
    items.push({ id: "finance", label: "Financeiro", href: "/finance", group: "Operação" });
  }
  if (state.capabilities.disputes) {
    items.push({ id: "disputes", label: "Disputas", href: "/disputes", group: "Operação" });
  }
  if (state.capabilities.matching) {
    items.push({ id: "matching", label: "Matching", href: "/matching", group: "Operação" });
  }
  if (state.capabilities.analytics) {
    items.push({ id: "analytics", label: "Analytics", href: "/analytics", group: "Operação" });
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
    { id: "creator-engagements", label: "Contratações", href: "/creator-engagements", group: "Operação" },
    { id: "contracts", label: "Contratos", href: "/contracts", group: "Operação" },
    { id: "deliverables", label: "Entregas", href: "/deliverables", group: "Operação" },
    { id: "payments", label: "Pagamentos", href: "/payments", group: "Operação" }
  ];
}
