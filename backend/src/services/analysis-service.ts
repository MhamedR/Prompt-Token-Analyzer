import { ModelCatalog } from '../config/model-catalog.js';
import { PRICING_CATALOG, type ModelDefinition } from '../config/models.js';
import { estimateCost } from '../domain/cost.js';
import {
  MAX_CHARACTERS_PER_FIELD,
  MAX_EXPECTED_OUTPUT_TOKENS,
  TOKEN_ESTIMATE_LIMITATIONS,
} from '../domain/limits.js';
import { countCharacters, countWords, type TextStats } from '../domain/text-stats.js';
import { AppError } from '../errors/app-error.js';
import { TokenizerError, type ProviderStatus, type TokenAccuracy, type TokenCount } from '../tokenizers/tokenizer-provider.js';
import type { TokenizerRegistry } from '../tokenizers/tokenizer-registry.js';

export interface CountRequest {
  model: string;
  text: string;
}

export interface CountResponse extends TokenMetadata {
  model: string;
  provider: ModelDefinition['provider'];
  wordCount: number;
  characterCount: number;
  tokenCount: number;
  limitations: readonly string[];
}

export interface AnalyzeRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  context: string;
  expectedOutputTokens: number;
}

export interface AnalyzeResponse extends TokenMetadata {
  model: string;
  provider: ModelDefinition['provider'];
  systemPromptTokens: number;
  userPromptTokens: number;
  contextTokens: number;
  totalInputTokens: number;
  expectedOutputTokens: number;
  totalTokens: number;
  wordCount: number;
  characterCount: number;
  sections: {
    systemPrompt: TextStats;
    userPrompt: TextStats;
    context: TextStats;
  };
  estimatedInputCostUsd: number | null;
  estimatedOutputCostUsd: number | null;
  totalEstimatedCostUsd: number | null;
  currency: 'USD';
  pricing: {
    inputPricePerMillionUsd: number | null;
    outputPricePerMillionUsd: number | null;
    cachedInputPricePerMillionUsd: number | null;
    source: string;
    verifiedOn: string;
    note: string;
  };
  limitations: readonly string[];
}

export interface ModelsResponse {
  models: ModelDefinition[];
  providers: ProviderStatus[];
  pricing: typeof PRICING_CATALOG;
  limits: {
    maxCharactersPerField: number;
    maxExpectedOutputTokens: number;
  };
  limitations: readonly string[];
}

interface SectionCount {
  wordCount: number;
  characterCount: number;
  count: TokenCount;
}

interface TokenMetadata {
  providerDisplayName: string;
  modelDisplayName: string;
  tokenizerMethod: string;
  accuracy: TokenAccuracy;
  accuracyNote: string;
  countingOnly: true;
}

export class AnalysisService {
  constructor(
    private readonly catalog: ModelCatalog,
    private readonly tokenizers: TokenizerRegistry,
  ) {}

  listModels(): ModelsResponse {
    return {
      models: [...this.catalog.list()],
      providers: this.tokenizers.describe(),
      pricing: PRICING_CATALOG,
      limits: {
        maxCharactersPerField: MAX_CHARACTERS_PER_FIELD,
        maxExpectedOutputTokens: MAX_EXPECTED_OUTPUT_TOKENS,
      },
      limitations: TOKEN_ESTIMATE_LIMITATIONS,
    };
  }

  async count(request: CountRequest): Promise<CountResponse> {
    const model = this.catalog.require(request.model);
    const stats = await this.statsFor(model, request.text);

    return {
      ...this.metadata(model, stats.count),
      model: model.id,
      provider: model.provider,
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
      tokenCount: stats.count.tokenCount,
      limitations: TOKEN_ESTIMATE_LIMITATIONS,
    };
  }

  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const model = this.catalog.require(request.model);
    const [systemPrompt, userPrompt, context] = await Promise.all([
      this.statsFor(model, request.systemPrompt),
      this.statsFor(model, request.userPrompt),
      this.statsFor(model, request.context),
    ]);
    const totalInputTokens =
      systemPrompt.count.tokenCount + userPrompt.count.tokenCount + context.count.tokenCount;
    const costs = this.costFor(model, totalInputTokens, request.expectedOutputTokens);

    return {
      ...this.metadata(model, userPrompt.count),
      model: model.id,
      provider: model.provider,
      systemPromptTokens: systemPrompt.count.tokenCount,
      userPromptTokens: userPrompt.count.tokenCount,
      contextTokens: context.count.tokenCount,
      totalInputTokens,
      expectedOutputTokens: request.expectedOutputTokens,
      totalTokens: totalInputTokens + request.expectedOutputTokens,
      wordCount: systemPrompt.wordCount + userPrompt.wordCount + context.wordCount,
      characterCount:
        systemPrompt.characterCount + userPrompt.characterCount + context.characterCount,
      sections: {
        systemPrompt: this.section(systemPrompt),
        userPrompt: this.section(userPrompt),
        context: this.section(context),
      },
      estimatedInputCostUsd: costs?.estimatedInputCostUsd ?? null,
      estimatedOutputCostUsd: costs?.estimatedOutputCostUsd ?? null,
      totalEstimatedCostUsd: costs?.totalEstimatedCostUsd ?? null,
      currency: 'USD',
      pricing: {
        inputPricePerMillionUsd: model.inputPricePerMillionUsd,
        outputPricePerMillionUsd: model.outputPricePerMillionUsd,
        cachedInputPricePerMillionUsd: model.cachedInputPricePerMillionUsd,
        source: model.priceSource,
        verifiedOn: model.priceVerifiedOn,
        note: model.priceNote,
      },
      limitations: TOKEN_ESTIMATE_LIMITATIONS,
    };
  }

  async warmTokenizers(): Promise<void> {
    await this.tokenizers.warm(this.catalog.list());
  }

  private metadata(model: ModelDefinition, count: TokenCount): TokenMetadata {
    return {
      providerDisplayName: model.providerDisplayName,
      modelDisplayName: model.displayName,
      tokenizerMethod: count.method,
      accuracy: count.accuracy,
      accuracyNote: count.accuracyNote,
      countingOnly: true,
    };
  }

  private async statsFor(model: ModelDefinition, text: string): Promise<SectionCount> {
    return {
      wordCount: countWords(text),
      characterCount: countCharacters(text),
      count: await this.tokensFor(model, text),
    };
  }

  private section(stats: SectionCount): TextStats {
    return {
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
      tokenCount: stats.count.tokenCount,
    };
  }

  private costFor(model: ModelDefinition, inputTokens: number, outputTokens: number) {
    if (model.inputPricePerMillionUsd === null || model.outputPricePerMillionUsd === null) {
      return null;
    }

    return estimateCost(inputTokens, outputTokens, {
      inputPricePerMillionUsd: model.inputPricePerMillionUsd,
      outputPricePerMillionUsd: model.outputPricePerMillionUsd,
    });
  }

  private async tokensFor(model: ModelDefinition, text: string): Promise<TokenCount> {
    try {
      return await this.tokenizers.countTokens(model, text);
    } catch (error) {
      if (error instanceof TokenizerError) {
        const status = error.code === 'TOKENIZE_FAILED' ? 400 : 500;
        throw new AppError(error.code, error.message, status);
      }

      throw error;
    }
  }
}
