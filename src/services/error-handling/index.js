export class ErrorHandler {
  constructor() {
    this.handlers = new Map();
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  handle(error, context = {}) {
    const handler = this.handlers.get(error.constructor) || this.handlers.get('default');
    if (handler) {
      return handler(error, context);
    }
    return {
      status: 500,
      message: 'An unexpected error occurred.',
    };
  }
}

export class AppError extends Error {
  constructor(message, status = 400, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed.', 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized.') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden.') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
