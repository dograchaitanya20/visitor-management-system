export type AppErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_WINDOW'
  | 'LIMIT_EXCEEDED'
  | 'ILLEGAL_TRANSITION'
  | 'PASS_INVALID'
  | 'STORAGE_FAILED'

/** Standardized application error for API domain and operational failures. */
export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
