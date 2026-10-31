import type { ModelDefinition } from '../config/models.js';
import { countLenml, loadLenml, type LenmlTokenizer } from './lenml-counter.js';
import {
  type ProviderStatus,
  type TokenAccuracy,
  type TokenCount,
  type TokenizerProvider,
} from './tokenizer-provider.js';

export interface LocalTokenizerSpec {
  key: string;
  /** Share one loaded vocabulary across keys that use the same package. */
  cacheKey?: string;
  method: string;
  accuracy: TokenAccuracy;
  note: string;
  load: () => Promise<{ fromPreTrained: () => LenmlTokenizer }>;
}

/**
 * Shared shape for providers whose tokenizer ships in a local package.
 * Each provider passes its own packages. They are not interchangeable.
 */
export class LocalTokenizerProvider implements TokenizerProvider {
  private readonly specs: Map<string, LocalTokenizerSpec>;

  constructor(
    readonly id: string,
    readonly displayName: string,
    readonly apiKeyEnv: string | null,
    specs: readonly LocalTokenizerSpec[],
    private readonly apiKeyConfigured = false,
    private readonly counting: ProviderStatus['counting'] = 'local',
  ) {
    this.specs = new Map(specs.map((spec) => [spec.key, spec]));
  }

  supports(model: ModelDefinition): boolean {
    return model.provider === this.id && this.specs.has(model.tokenizerKey);
  }

  describe(): ProviderStatus {
    return {
      id: this.id,
      displayName: this.displayName,
      counting: this.counting,
      apiKeyConfigured: this.apiKeyConfigured,
      apiKeyEnv: this.apiKeyEnv,
    };
  }

  async warm(): Promise<void> {
    await Promise.all([...this.specs.values()].map((spec) => this.tokenizer(spec)));
  }

  async countTokens(model: ModelDefinition, text: string): Promise<TokenCount> {
    const spec = this.specs.get(model.tokenizerKey);
    if (!spec) {
      throw new Error(`Missing local tokenizer spec for ${model.tokenizerKey}`);
    }

    return {
      tokenCount: await countLenml(this.tokenizer(spec), text),
      accuracy: spec.accuracy,
      method: spec.method,
      accuracyNote: spec.note,
      countingOnly: true,
    };
  }

  private tokenizer(spec: LocalTokenizerSpec): Promise<LenmlTokenizer> {
    return loadLenml(spec.cacheKey ?? spec.key, spec.load);
  }
}
