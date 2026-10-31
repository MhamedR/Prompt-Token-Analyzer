import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { ModelDefinition } from '../config/models.js';
import {
  TokenizerError,
  type ProviderStatus,
  type TokenCount,
  type TokenizerProvider,
} from './tokenizer-provider.js';

const SUPPORTED_ENCODINGS = new Set([
  'o200k_base',
  'cl100k_base',
  'p50k_base',
  'p50k_edit',
  'r50k_base',
  'gpt2',
]);

const NOTE =
  'Plain text is counted with js-tiktoken, a JavaScript port of OpenAI tiktoken, for the encoding configured on the model. Chat framing, tools, and images are not included. This does not call the OpenAI API.';

export class OpenAiTiktokenProvider implements TokenizerProvider {
  readonly id = 'openai';
  readonly displayName = 'OpenAI';
  readonly apiKeyEnv = null;
  private readonly cache = new Map<string, Tiktoken>();

  supports(model: ModelDefinition): boolean {
    return model.provider === this.id && SUPPORTED_ENCODINGS.has(model.tokenizerKey);
  }

  describe(): ProviderStatus {
    return {
      id: this.id,
      displayName: this.displayName,
      counting: 'local',
      apiKeyConfigured: false,
      apiKeyEnv: null,
    };
  }

  async warm(): Promise<void> {
    this.encoderFor('o200k_base');
  }

  async countTokens(model: ModelDefinition, text: string): Promise<TokenCount> {
    const encoder = this.encoderFor(model.tokenizerKey);
    const tokenCount = text.length === 0 ? 0 : this.encode(encoder, text);

    return {
      tokenCount,
      accuracy: 'exact',
      method: `js-tiktoken ${model.tokenizerKey}`,
      accuracyNote: NOTE,
      countingOnly: true,
    };
  }

  private encode(encoder: Tiktoken, text: string): number {
    try {
      return encoder.encode(text, 'all').length;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown tokenizer error';
      throw new TokenizerError(`The text could not be tokenized. ${detail}`, 'TOKENIZE_FAILED');
    }
  }

  private encoderFor(encoding: string): Tiktoken {
    if (!SUPPORTED_ENCODINGS.has(encoding)) {
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
