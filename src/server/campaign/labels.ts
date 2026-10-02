export const campaignStatusLabels = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  CANCELLATION_PENDING: "Cancelamento pendente",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  ARCHIVED: "Arquivada"
} as const;

export const recruitmentLabels = {
  NOT_OPEN: "Não aberta",
  OPEN: "Aberta",
  CLOSED: "Encerrada"
} as const;

export const visibilityLabels = {
  OPEN: "Aberta",
  PRIVATE: "Privada"
} as const;

export const promotedObjectLabels = {
  MUSIC_TRACK: "Música",
  MUSIC_RELEASE: "Lançamento",
  ARTIST: "Artista",
  COMPANY: "Empresa",
  BRAND: "Marca",
  PRODUCT: "Produto",
  SERVICE: "Serviço",
  PLATFORM: "Plataforma",
  EVENT: "Evento",
  PROJECT: "Projeto",
  INSTITUTIONAL_INITIATIVE: "Iniciativa institucional"
} as const;

export const readinessLabels = {
  READY: "Pronta",
  READY_WITH_WARNINGS: "Pronta com avisos",
  BLOCKED: "Bloqueada"
} as const;

export const campaignStepLabels = [
  "Objeto promovido",
  "Objetivo e contexto",
  "Creators e público",
  "Conteúdo e publicações",
  "Briefing e arquivos",
  "Período",
  "Orçamento e capacidade",
  "Direitos e termos",
  "Analytics e rastreamento",
  "Revisão e ativação"
] as const;

export const campaignReadinessReasonLabels: Record<string, string> = {
  CAMPAIGN_NOT_FOUND: "Campanha não encontrada.",
  CAMPAIGN_PROMOTED_OBJECT_REQUIRED: "Selecione um objeto promovido.",
  CAMPAIGN_PROMOTED_OBJECT_BLOCKED: "O objeto promovido possui bloqueios.",
  CAMPAIGN_PROMOTED_OBJECT_ACCESS_REQUIRED:
    "O workspace precisa de acesso válido ao objeto promovido.",
  CAMPAIGN_GOAL_REQUIRED: "Selecione um objetivo.",
  CAMPAIGN_GOAL_INCOMPATIBLE: "O objetivo não é compatível com o objeto promovido.",
  CAMPAIGN_CONTENT_REQUIREMENT_REQUIRED:
    "Adicione pelo menos um requisito de conteúdo.",
  CAMPAIGN_BRIEF_REQUIRED: "Preencha o briefing.",
  CAMPAIGN_SCHEDULE_INVALID: "Revise o período da campanha.",
  CAMPAIGN_BUDGET_INVALID: "Revise o orçamento planejado.",
  CAMPAIGN_ASSET_ACCESS_DENIED: "Revise os arquivos vinculados.",
  CAMPAIGN_TRACKING_OPTIONAL: "O rastreamento é opcional e ainda não foi configurado.",
  ENTITY_ARCHIVED: "O objeto promovido está arquivado."
};
