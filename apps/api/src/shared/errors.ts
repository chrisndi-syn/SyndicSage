// ── Standardised API error ────────────────────────────────────
// Every Hono route throws AppError. The global error handler
// catches it and returns the same shape every time.
// Frontend shared/errors.ts reads this one shape — no guessing.

export class AppError extends Error {
  constructor(
    public readonly code:    string,
    message:                 string,
    public readonly status:  number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ── Common errors — use these instead of new AppError() inline ─
export const Errors = {
  unauthorized:   () => new AppError('UNAUTHORIZED',    'Authentication required',         401),
  forbidden:      () => new AppError('FORBIDDEN',       'You do not have permission',      403),
  notFound:       (r = 'Resource') =>
                       new AppError('NOT_FOUND',        `${r} not found`,                  404),
  tenantMismatch: () => new AppError('TENANT_MISMATCH', 'Access denied',                   403),
  badRequest:     (msg: string) =>
                       new AppError('BAD_REQUEST',      msg,                               400),
  conflict:       (msg: string) =>
                       new AppError('CONFLICT',         msg,                               409),
  internal:       () => new AppError('INTERNAL_ERROR',  'An unexpected error occurred',    500),
} as const
