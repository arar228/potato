export class AppError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  public constructor(message = 'Telegram authentication is required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class NotFoundError extends AppError {
  public constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  public constructor(message: string, code = 'CONFLICT') {
    super(409, code, message);
  }
}

export class InsufficientBalanceError extends ConflictError {
  public constructor() {
    super('Недостаточно игровых звёзд для этой ставки', 'INSUFFICIENT_BALANCE');
  }
}
