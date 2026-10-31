import type { ModelDefinition } from '../config/models.js';
import { TokenizerError, type ProviderStatus, type TokenCount, type TokenizerProvider } from './tokenizer-provider.js';

export class TokenizerRegistry {
  constructor(private readonly providers: readonly TokenizerProvider[]) {}

  describe(): ProviderStatus[] {
    return this.providers.map((provider) => provider.describe());
  }

  supports(model: ModelDefinition): boolean {
    return this.providerFor(model.provider)?.supports(model) ?? false;
  }

  async countTokens(model: ModelDefinition, text: string): Promise<TokenCount> {
    const provider = this.providerFor(model.provider);
    if (!provider) {
      throw new TokenizerError(
        `No tokenizer is registered for provider "${model.provider}". Add a TokenizerProvider before enabling models from that provider.`,
        'UNSUPPORTED_PROVIDER',
      );
    }

    if (!provider.supports(model)) {
      throw new TokenizerError(
        `Tokenizer "${model.tokenizerKey}" is not available for provider "${model.provider}".`,
        'UNSUPPORTED_ENCODING',
      );
    }

    return provider.countTokens(model, text);
  }

  async warm(models: readonly ModelDefinition[]): Promise<void> {
    for (const model of models) {
      if (!this.supports(model)) {
        throw new TokenizerError(
          `Model "${model.id}" has no registered tokenizer.`,
          'UNSUPPORTED_ENCODING',
        );
      }
    }

    await Promise.all(this.providers.map((provider) => provider.warm()));
  }

  private providerFor(providerId: string): TokenizerProvider | undefined {
    return this.providers.find((provider) => provider.id === providerId);
  }
}
