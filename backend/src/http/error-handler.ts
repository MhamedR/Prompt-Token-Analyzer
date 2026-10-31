import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';

export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.',
      details: [],
    },
  });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (isBodyParseError(error)) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
        details: [],
      },
    });
    return;
  }

  if (isPayloadTooLarge(error)) {
    response.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large.',
        details: [],
      },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error.',
      details: [],
    },
  });
}

function isBodyParseError(error: unknown): boolean {
  return hasType(error, 'entity.parse.failed');
}

function isPayloadTooLarge(error: unknown): boolean {
  return hasType(error, 'entity.too.large');
}

function hasType(error: unknown, type: string): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === type;
}
