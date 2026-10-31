import { getEncoding, type Tiktoken } from 'js-tiktoken';
import { TokenizerError, type TokenizerProvider } from './tokenizer-provider.js';

/**
 * Encodings shipped by js-tiktoken 1.0.x (a pure JavaScript port of OpenAI tiktoken).
 * GPT-4o, GPT-4o mini, and the GPT-4.1 family use o200k_base.
 * cl100k_base remains available for older GPT-4 and GPT-3.5 models.
 */
const SUPPORTED_ENCODINGS = new Set([
  'o200k_base',
  'cl100k_base',
  'p50k_base',
  'p50k_edit',
  'r50k_base',
  'gpt2',
]);

export class OpenAiTiktokenProvider implements TokenizerProvider {
  readonly id = 'openai';
  private readonly cache = new Map<string, Tiktoken>();

  supportsEncoding(encoding: string): boolean {
    return SUPPORTED_ENCODINGS.has(encoding);
  }

  countTokens(encoding: string, text: string): number {
    const encoder = this.encoderFor(encoding);
    if (text.length === 0) {
      return 0;
    }

    try {
      // Allow special-token markers so a prompt that mentions them is counted
      // instead of rejected. They count as those tokens, which is closer to
      // model input than splitting the marker into ordinary pieces.
      return encoder.encode(text, 'all').length;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown tokenizer error';
      throw new TokenizerError(`The text could not be tokenized. ${detail}`, 'TOKENIZE_FAILED');
    }
  }

  private encoderFor(encoding: string): Tiktoken {
    if (!this.supportsEncoding(encoding)) {
      throw new TokenizerError(
        `Encoding "${encoding}" is not available for the OpenAI tokenizer.`,
        'UNSUPPORTED_ENCODING',
      );
    }

    const cached = this.cache.get(encoding);
    if (cached) {
      return cached;
    }

    try {
      const created = getEncoding(encoding as Parameters<typeof getEncoding>[0]);
      this.cache.set(encoding, created);
      return created;
    } catch {
      throw new TokenizerError(
        `Encoding "${encoding}" could not be loaded from js-tiktoken.`,
        'UNSUPPORTED_ENCODING',
      );
    }
  }
}
