import { DomainError } from "@/server/shared/domain-error";

export type PublicError = { code: string; message: string; details?: Record<string, unknown> };

const messages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: "Entre na sua conta para continuar.",
  ACCOUNT_ACCESS_DENIED: "Esta conta não pode realizar esta ação.",
  EMAIL_VERIFICATION_REQUIRED: "Verifique seu e-mail antes de continuar.",
  WORKSPACE_ACCESS_DENIED: "Você não tem acesso a este workspace.",
  WORKSPACE_NOT_FOUND: "Workspace não encontrado.",
  MEMBERSHIP_INACTIVE: "Seu acesso a este workspace não está ativo.",
  MEMBERSHIP_NOT_FOUND: "Membro não encontrado.",
  MISSING_PERMISSION: "Você não tem permissão para realizar esta ação.",
  LAST_OWNER_PROTECTED: "O último proprietário ativo não pode ser removido, suspenso ou rebaixado.",
  INVITATION_EXPIRED: "Este convite é inválido, expirou ou já foi utilizado.",
  INVITATION_RECIPIENT_MISMATCH: "Este convite pertence a outro endereço de e-mail.",
  INVALID_REQUEST: "Verifique os dados informados e tente novamente.",
  UNTRUSTED_ORIGIN: "A origem desta solicitação não é permitida.",
  TAXONOMY_NOT_FOUND: "Classificação não encontrada.",
  TAXONOMY_VALUE_DEPRECATED: "Esta classificação não está mais disponível para novas seleções.",
  INVALID_TAXONOMY_HIERARCHY: "A hierarquia informada não é válida.",
  INVALID_MEDIA_TYPE: "O tipo do arquivo não é permitido ou não corresponde ao conteúdo.",
  MEDIA_TOO_LARGE: "O arquivo excede o limite técnico permitido.",
  MEDIA_NOT_FOUND: "Arquivo não encontrado.",
  MEDIA_ACCESS_DENIED: "O acesso temporário a este arquivo é inválido ou expirou.",
  MEDIA_STORAGE_UNAVAILABLE: "O arquivo está temporariamente indisponível.",
  CREATOR_PROFILE_NOT_FOUND: "Perfil de Creator não encontrado.",
  CREATOR_PROFILE_ALREADY_EXISTS: "Você já possui um perfil de Creator.",
  CREATOR_PROFILE_ACCESS_DENIED: "Você não tem acesso a este perfil de Creator.",
  CREATOR_PROFILE_INCOMPLETE: "Complete os dados obrigatórios antes de enviar o perfil para análise.",
  CREATOR_TAXONOMY_INVALID: "A classificação selecionada não é válida para este campo.",
  SOCIAL_PROFILE_ALREADY_LINKED: "Esta rede social já está vinculada.",
  SOCIAL_PROFILE_INVALID: "A rede social informada não é válida.",
  SOCIAL_PROFILE_NOT_FOUND: "Rede social não encontrada.",
  CREATOR_NOT_MARKETPLACE_ELIGIBLE: "Este perfil ainda não pode ficar visível.",
  CREATOR_MEDIA_ACCESS_DENIED: "Este arquivo não pode ser vinculado ao perfil de Creator.",
  INVALID_REFERENCE_DATA: "A opção selecionada não é válida.",
  INVALID_CREATOR_STATUS_TRANSITION: "Esta mudança de situação do Creator não é permitida.",
  ARTIST_NOT_FOUND: "Artista não encontrado.",
  ARTIST_ACCESS_DENIED: "Você não tem acesso a este Artista.",
  ARTIST_INVALID: "Verifique os dados do Artista.",
  RELEASE_NOT_FOUND: "Lançamento não encontrado.",
  RELEASE_INVALID: "Verifique os dados do lançamento.",
  TRACK_NOT_FOUND: "Música não encontrada.",
  TRACK_ACCESS_DENIED: "Você não tem acesso a esta música.",
  TRACK_INVALID: "Verifique os dados da música.",
  TRACK_SEGMENT_INVALID: "O trecho informado não é válido.",
  ISRC_INVALID: "O ISRC informado não é válido.",
  DURATION_INVALID: "A duração informada não é válida.",
  GENRE_INVALID: "O gênero informado não é válido.",
  URL_INVALID: "Uma das URLs informadas não é válida.",
  MUSIC_IMPORT_INVALID: "A planilha contém dados inválidos ou não segue o modelo.",
  MUSIC_IMPORT_DUPLICATE_RESOLUTION_REQUIRED: "Resolva as possíveis duplicidades antes de confirmar a importação.",
  PROMOTED_ENTITY_NOT_FOUND: "Objeto promovido não encontrado.",
  PROMOTED_ENTITY_ACCESS_DENIED: "Você não tem acesso a este objeto promovido.",
  PROMOTED_ENTITY_NOT_READY: "Este objeto ainda não está pronto para uso.",
  PROMOTED_ENTITY_ARCHIVED: "Este objeto está arquivado.",
  COMPANY_REQUIRED: "Selecione uma empresa válida.",
  PARENT_ENTITY_INVALID: "O contexto comercial informado não é válido.",
  POSSIBLE_DUPLICATE_REQUIRES_RESOLUTION: "Há um possível duplicado. Confirme como deseja continuar.",
  EXISTING_ENTITY_NOT_DUPLICATE: "O registro existente selecionado não corresponde ao contexto informado.",
  PROMOTED_ENTITY_MEDIA_ACCESS_DENIED: "Este arquivo não pode ser vinculado ao objeto promovido.",
  CAMPAIGN_NOT_FOUND: "Campanha não encontrada.",
  CAMPAIGN_ACCESS_DENIED: "Você não tem acesso a esta campanha.",
  CAMPAIGN_INVALID_STATUS_TRANSITION: "Esta mudança de situação da campanha não é permitida.",
  CAMPAIGN_NOT_READY: "Esta campanha ainda não pode ser ativada.",
  CAMPAIGN_PROMOTED_OBJECT_REQUIRED: "Selecione o objeto promovido da campanha.",
  CAMPAIGN_PROMOTED_OBJECT_BLOCKED: "O objeto promovido selecionado possui bloqueios.",
  CAMPAIGN_PROMOTED_OBJECT_ACCESS_REQUIRED: "O workspace não possui mais acesso ao objeto promovido.",
  CAMPAIGN_GOAL_REQUIRED: "Selecione o objetivo da campanha.",
  CAMPAIGN_GOAL_INCOMPATIBLE: "O objetivo não é compatível com o objeto promovido.",
  CAMPAIGN_SCHEDULE_INVALID: "Revise o período da campanha.",
  CAMPAIGN_BUDGET_INVALID: "Revise o orçamento planejado.",
  CAMPAIGN_ASSET_ACCESS_DENIED: "Um dos arquivos não está disponível para esta campanha.",
  CAMPAIGN_MATERIAL_EDIT_LOCKED: "A configuração material desta campanha está bloqueada nesta situação.",
  CAMPAIGN_STALE_WRITE: "A campanha foi atualizada em outra operação. Recarregue antes de salvar.",
  AUTHORIZATION_CONFIGURATION_ERROR: "A configuração de permissões não permite esta ação. Contate o suporte.",
  CAMPAIGN_BUILDER_STEP_INVALID: "A etapa do construtor informada não é válida.",
  CAMPAIGN_CAPACITY_INVALID: "Revise a quantidade de creators planejada.",
  CAMPAIGN_CONTENT_INVALID: "Revise os requisitos de conteúdo da campanha.",
  CAMPAIGN_NAME_REQUIRED: "Informe o nome da campanha.",
  CAMPAIGN_NOT_ACCEPTING_APPLICATIONS: "Esta campanha não está recebendo candidaturas.",
  CAMPAIGN_TARGETING_RANGE_INVALID: "Revise a faixa de seguidores do público-alvo.",
  CREATOR_PROFILE_REQUIRED: "Crie seu perfil de Creator para continuar.",
  CREATOR_NOT_ELIGIBLE: "Seu perfil ainda não pode se candidatar a campanhas.",
  CREATOR_NOT_INVITABLE: "Este Creator não está disponível para convite.",
  LANGUAGE_INVALID: "O idioma informado não é válido.",
  PRIMARY_ARTIST_REQUIRED: "Informe ao menos um artista principal.",
  MEDIA_NOT_AVAILABLE: "O arquivo selecionado não está disponível para este uso.",
  MUSIC_IMPORT_ARTIST_ACCESS_DENIED: "Você só pode usar na importação artistas que este workspace já gerencia.",
  PROMOTED_ENTITY_OWNER_ACCESS_PROTECTED: "O acesso de proprietário não pode ser reduzido por esta operação.",
  PARTICIPATION_NOT_FOUND: "Participação não encontrada.",
  PARTICIPATION_ALREADY_EXISTS: "Já existe uma participação deste Creator nesta campanha.",
  PARTICIPATION_ACCEPTANCE_REQUIRES_PROPOSAL: "A participação só é aceita quando uma proposta é aceita.",
  PARTICIPATION_TRANSITION_REJECTED: "Esta mudança de situação da participação não é permitida.",
  PROPOSAL_NOT_FOUND: "Proposta não encontrada.",
  PROPOSAL_NOT_ALLOWED: "Esta participação não pode receber uma proposta agora.",
  PROPOSAL_INVALID: "Revise o valor, a moeda e o escopo da proposta.",
  PROPOSAL_ALREADY_OPEN: "Já existe uma rodada de proposta aguardando resposta.",
  PROPOSAL_RESPONSE_NOT_ALLOWED: "Esta proposta não pode mais ser respondida.",
  PROPOSAL_COUNTER_NOT_ALLOWED: "Esta proposta não pode mais receber contraproposta.",
  ENGAGEMENT_NOT_FOUND: "Contratação não encontrada.",
  ENGAGEMENT_ALREADY_EXISTS: "Já existe uma contratação para esta proposta.",
  ENGAGEMENT_REQUIRES_ACCEPTED_PROPOSAL: "A contratação exige uma proposta aceita.",
  ENGAGEMENT_STATE_CONFLICT: "A contratação mudou de situação. Recarregue e tente novamente.",
  CONTRACT_NOT_ALLOWED: "Não é possível criar um contrato para esta contratação agora.",
  CONTRACT_ALREADY_LIVE: "Já existe um contrato em andamento para esta contratação.",
  CONTRACT_SEND_NOT_ALLOWED: "Este contrato não pode ser enviado.",
  CONTRACT_SIGN_NOT_ALLOWED: "Este contrato não pode ser assinado agora.",
  DELIVERABLE_NOT_FOUND: "Entrega não encontrada.",
  DELIVERABLE_REQUIRES_ACTIVE_ENGAGEMENT: "A entrega exige uma contratação ativa.",
  CONTENT_VERSION_NOT_FOUND: "Versão de conteúdo não encontrada.",
  CONTENT_REFERENCE_REQUIRED: "Informe um arquivo ou uma URL HTTPS do conteúdo.",
  CONTENT_URL_INVALID: "A URL do conteúdo deve começar com https://.",
  CONTENT_SUBMISSION_NOT_ALLOWED: "O conteúdo não pode ser enviado nesta situação da entrega.",
  CONTENT_REVIEW_NOT_ALLOWED: "Esta versão de conteúdo não pode mais ser revisada.",
  PUBLICATION_REQUIRES_APPROVED_CONTENT: "A publicação exige conteúdo aprovado.",
  PUBLICATION_ALREADY_PLANNED: "Já existe uma publicação planejada para esta entrega.",
  PUBLICATION_PROOF_URL_INVALID: "A URL da comprovação deve começar com https://.",
  PUBLICATION_PROOF_NOT_ALLOWED: "A comprovação não pode ser enviada nesta situação da publicação.",
  PUBLICATION_VERIFY_NOT_ALLOWED: "Esta publicação não pode ser verificada agora.",
  PUBLICATION_NOT_METRIC_ELIGIBLE: "Só é possível registrar métricas de publicações já publicadas.",
  METRICS_INVALID: "Revise os valores e a origem das métricas.",
  PAYABLE_NOT_FOUND: "Pagamento não encontrado.",
  PAYABLE_REQUIRES_ACTIVE_ENGAGEMENT: "O pagamento exige uma contratação ativa.",
  PAYABLE_NOT_ELIGIBLE: "Todas as publicações exigidas precisam estar verificadas.",
  PAYABLE_RELEASE_NOT_ALLOWED: "Este pagamento não pode ser liberado agora.",
  PAYABLE_PAYMENT_NOT_ALLOWED: "Este pagamento não pode ser marcado como pago agora.",
  PAYABLE_REFERENCE_REQUIRED: "Informe a referência do pagamento.",
  PAYABLE_REFERENCE_IN_USE: "Esta referência de pagamento já foi usada.",
  PAYABLE_ALREADY_PAID: "Este pagamento já foi registrado com outra referência.",
  DISPUTE_ALREADY_ACTIVE: "Já existe uma disputa em andamento para esta contratação.",
  DISPUTE_REVIEW_NOT_ALLOWED: "A análise desta disputa não pode ser iniciada.",
  DISPUTE_RESOLUTION_NOT_ALLOWED: "Esta disputa não pode ser resolvida.",
};

const fallback: PublicError = {
  code: "INTERNAL_ERROR",
  message: "Não foi possível concluir a operação. Tente novamente."
};

export function toPublicError(error: unknown): PublicError {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: messages[error.code] ?? fallback.message,
      ...(error.publicDetails ? { details: error.publicDetails } : {})
    };
  }

  if (
    error instanceof Error &&
    (error.name === "ValidationError" || error.name === "ZodError")
  ) {
    return { code: "INVALID_REQUEST", message: messages.INVALID_REQUEST };
  }

  // PostgreSQL 22P02 (invalid_text_representation): a malformed identifier such as a non-UUID path/query value.
  if (typeof error === "object" && error !== null && (error as { code?: unknown }).code === "22P02") {
    return { code: "INVALID_REQUEST", message: messages.INVALID_REQUEST };
  }

  return fallback;
}
