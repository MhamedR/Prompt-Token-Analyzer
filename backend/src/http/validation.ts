import { MAX_CHARACTERS_PER_FIELD, MAX_EXPECTED_OUTPUT_TOKENS } from '../domain/limits.js';
import { AppError, type FieldError } from '../errors/app-error.js';
import type { AnalyzeRequest, CountRequest } from '../services/analysis-service.js';

export function parseCountBody(body: unknown): CountRequest {
  const record = requireRecord(body);
  const details: FieldError[] = [];
  const model = readModel(record, details);
  const text = readText(record, 'text', details);

  throwIfInvalid(details);
  return { model, text };
}

export function parseAnalyzeBody(body: unknown): AnalyzeRequest {
  const record = requireRecord(body);
  const details: FieldError[] = [];
  const model = readModel(record, details);
  const systemPrompt = readText(record, 'systemPrompt', details);
  const userPrompt = readText(record, 'userPrompt', details);
  const context = readText(record, 'context', details);
  const expectedOutputTokens = readOutputTokens(record, details);

  throwIfInvalid(details);
  return { model, systemPrompt, userPrompt, context, expectedOutputTokens };
}

function requireRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('VALIDATION_ERROR', 'Request body must be a JSON object.', 400);
  }

  return body as Record<string, unknown>;
}

function readModel(body: Record<string, unknown>, details: FieldError[]): string {
  const value = body.model;
  if (typeof value !== 'string' || value.trim() === '') {
    details.push({ field: 'model', message: 'model must be a non-empty string.' });
    return '';
  }

  return value.trim();
}

function readText(body: Record<string, unknown>, field: string, details: FieldError[]): string {
  const value = body[field];
  if (typeof value !== 'string') {
    details.push({ field, message: `${field} must be a string.` });
    return '';
  }

  if (value.length > MAX_CHARACTERS_PER_FIELD) {
    details.push({
      field,
      message: `${field} must be at most ${MAX_CHARACTERS_PER_FIELD} characters.`,
    });
  }

  return value;
}

function readOutputTokens(body: Record<string, unknown>, details: FieldError[]): number {
  const value = body.expectedOutputTokens;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_EXPECTED_OUTPUT_TOKENS
  ) {
    details.push({
      field: 'expectedOutputTokens',
      message: `expectedOutputTokens must be an integer from 0 to ${MAX_EXPECTED_OUTPUT_TOKENS}.`,
    });
    return 0;
  }

  return value;
}

function throwIfInvalid(details: FieldError[]): void {
  if (details.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'Request validation failed.', 400, details);
  }
}
