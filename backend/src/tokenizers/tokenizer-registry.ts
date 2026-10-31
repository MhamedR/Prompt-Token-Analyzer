import { TokenizerError, type TokenizerProvider } from './tokenizer-provider.js';

export class TokenizerRegistry {
  constructor(private readonly providers: readonly TokenizerProvider[]) {}

  supports(providerId: string, encoding: string): boolean {
    const provider = this.providers.find((item) => item.id === providerId);
    return provider?.supportsEncoding(encoding) ?? false;
  }

  countTokens(providerId: string, encoding: string, text: string): number {
    const provider = this.providers.find((item) => item.id === providerId);
    if (!provider) {
      throw new TokenizerError(
        `No tokenizer is registered for provider "${providerId}". Add a TokenizerProvider before enabling models from that provider.`,
        'UNSUPPORTED_PROVIDER',
      );
    }

    return provider.countTokens(encoding, text);
  }
}
