export class TokenizerError extends Error {
  constructor(
    message: string,
    readonly code: 'UNSUPPORTED_PROVIDER' | 'UNSUPPORTED_ENCODING' | 'TOKENIZE_FAILED',
  ) {
    super(message);
    this.name = 'TokenizerError';
  }
}

/**
 * One tokenizer implementation per model provider.
 * Register a new class when adding Anthropic, Google, or Meta models.
 */
export interface TokenizerProvider {
  readonly id: string;
  supportsEncoding(encoding: string): boolean;
  countTokens(encoding: string, text: string): number;
}
