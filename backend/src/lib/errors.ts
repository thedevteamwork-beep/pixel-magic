export type ErrorCode =
  | "UNAUTHENTICATED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "PLAN_NOT_AVAILABLE"
  | "ADDON_NOT_AVAILABLE"
  | "ALREADY_ON_PLAN"
  | "RENEWAL_IN_PROGRESS"
  | "PAYMENT_PAST_DUE"
  | "NO_SCHEDULED_CHANGE"
  | "INSUFFICIENT_CREDITS"
  | "PAYMENT_PROVIDER_ERROR"
  | "UPLOAD_NOT_READY"
  | "IDEMPOTENCY_KEY_REUSED"
  | "TOO_MANY_ACTIVE_JOBS"
  | "JOB_NOT_COMPLETED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly meta?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
