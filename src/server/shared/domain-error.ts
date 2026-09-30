export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly publicDetails?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
  }
}
