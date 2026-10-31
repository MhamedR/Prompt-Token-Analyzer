export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly details: FieldError[];

  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    details: FieldError[] = [],
  ) {
    super(message);
    this.name = 'AppError';
    this.details = details;
  }
}
