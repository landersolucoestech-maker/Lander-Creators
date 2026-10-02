export const proposalStatusLabels: Record<string, string> = {
  PENDING_CREATOR: "Aguardando sua resposta",
  PENDING_WORKSPACE: "Aguardando o contratante",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  SUPERSEDED: "Substituída por contraproposta",
  WITHDRAWN: "Encerrada"
};
export const contractStatusLabels: Record<string, string> = {
  SENT: "Aguardando sua assinatura",
  SIGNED_CREATOR: "Aguardando assinatura do contratante",
  SIGNED_WORKSPACE: "Assinado pelo contratante",
  EXECUTED: "Em vigor",
  VOID: "Anulado"
};
export const deliverableStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Em revisão",
  CHANGES_REQUESTED: "Ajustes solicitados",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
  CANCELLED: "Cancelada"
};
export const publicationStatusLabels: Record<string, string> = {
  PLANNED: "Planejada",
  READY: "Aguardando comprovação",
  PUBLISHED: "Aguardando verificação",
  VERIFIED: "Verificada",
  FAILED: "Falhou",
  CANCELLED: "Cancelada"
};
export const publicationModeLabels: Record<string, string> = {
  CREATOR_PROFILE: "Perfil do Creator",
  CONTRACTOR_PROFILE: "Perfil do contratante",
  COLLAB: "Collab"
};
export const payableStatusLabels: Record<string, string> = {
  PENDING: "Aguardando publicações verificadas",
  ELIGIBLE: "Elegível",
  RELEASED: "Liberado",
  PAID: "Pago",
  CANCELLED: "Cancelado"
};
export const platformLabels: Record<string, string> = { TIKTOK: "TikTok", INSTAGRAM: "Instagram", YOUTUBE: "YouTube" };
export const contentFormatLabels: Record<string, string> = {
  VIDEO: "Vídeo",
  REEL: "Reel",
  STORY: "Story",
  FEED_POST: "Post no feed",
  SHORT: "Short",
  CAROUSEL: "Carrossel"
};
/** Known codes get a PT-BR label; unknown codes degrade to the stored value rather than hiding it. */
export function labelOr(map: Record<string, string>, code: string): string {
  return map[code] ?? code;
}
