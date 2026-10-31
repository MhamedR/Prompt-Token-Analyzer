import type { ModelDefinition } from '../config/models.js';

export type TokenAccuracy = 'exact' | 'approximate' | 'api-reported';

export interface TokenCount {
  tokenCount: number;
  accuracy: TokenAccuracy;
  /** Human-readable tokenizer or count endpoint. Not a generation call. */
  method: string;
  accuracyNote: string;
  /** True when this result did not call a model generation endpoint. */
  countingOnly: true;
}

export interface ProviderStatus {
  id: string;
  displayName: string;
  /** local means no network call. count-api means a token-counting endpoint, not generation. */
  counting: 'local' | 'count-api';
  apiKeyConfigured: boolean;
  apiKeyEnv: string | null;
}

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
 * One implementation per model provider.
 * Register a new class in createTokenizerRegistry. The analysis service
 * only talks to this interface.
 */
export interface TokenizerProvider {
  readonly id: string;
  readonly displayName: string;
  readonly apiKeyEnv: string | null;
  supports(model: ModelDefinition): boolean;
  describe(): ProviderStatus;
  countTokens(model: ModelDefinition, text: string): Promise<TokenCount>;
  warm(): Promise<void>;
}
