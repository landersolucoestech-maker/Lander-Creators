import { DomainError } from "@/server/shared/domain-error";

export type PublicError = { code: string; message: string };

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
  UNTRUSTED_ORIGIN: "A origem desta solicitação não é permitida."
};

const fallback: PublicError = {
  code: "INTERNAL_ERROR",
  message: "Não foi possível concluir a operação. Tente novamente."
};

export function toPublicError(error: unknown): PublicError {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: messages[error.code] ?? fallback.message
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
