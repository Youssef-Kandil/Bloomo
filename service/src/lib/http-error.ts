export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }
  static tooMany(message = 'Too many requests'): AppError {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }
  static internal(message = 'Internal error', details?: unknown): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message, details);
  }
}
