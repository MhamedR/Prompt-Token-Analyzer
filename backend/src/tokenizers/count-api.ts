import { TokenizerError } from './tokenizer-provider.js';

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new TokenizerError('The token-counting API could not be reached.', 'TOKENIZE_FAILED');
  }

  if (!response.ok) {
    throw new TokenizerError(
      `The token-counting API returned HTTP ${response.status}. No completion was requested.`,
      'TOKENIZE_FAILED',
    );
  }

  return response.json() as Promise<unknown>;
}

export function readInteger(value: unknown, field: string): number {
  if (typeof value !== 'object' || value === null || !(field in value)) {
    throw new TokenizerError('The token-counting API returned an unexpected payload.', 'TOKENIZE_FAILED');
  }

  const count = (value as Record<string, unknown>)[field];
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new TokenizerError('The token-counting API returned an unexpected token count.', 'TOKENIZE_FAILED');
  }

  return count;
}
