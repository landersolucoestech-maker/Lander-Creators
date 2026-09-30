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

  return fallback;
}
