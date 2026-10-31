import { MODELS, PRICING_CATALOG, type ModelDefinition } from '../config/models.js';
import { estimateCost } from '../domain/cost.js';
import {
  MAX_CHARACTERS_PER_FIELD,
  MAX_EXPECTED_OUTPUT_TOKENS,
  TOKEN_ESTIMATE_LIMITATIONS,
} from '../domain/limits.js';
import { countCharacters, countWords, type TextStats } from '../domain/text-stats.js';
import { AppError } from '../errors/app-error.js';
import { TokenizerError } from '../tokenizers/tokenizer-provider.js';
import type { TokenizerRegistry } from '../tokenizers/tokenizer-registry.js';

export interface CountRequest {
  model: string;
  text: string;
}

export interface CountResponse {
  model: string;
  encoding: string;
  wordCount: number;
  characterCount: number;
  tokenCount: number;
  estimate: true;
  limitations: readonly string[];
}

export interface AnalyzeRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  context: string;
  expectedOutputTokens: number;
}

export interface AnalyzeResponse {
  model: string;
  encoding: string;
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
  estimatedInputCostUsd: number;
  estimatedOutputCostUsd: number;
  totalEstimatedCostUsd: number;
  currency: 'USD';
  pricing: {
    inputPricePerMillionUsd: number;
    outputPricePerMillionUsd: number;
    cachedInputPricePerMillionUsd: number | null;
    tier: string;
    source: string;
    verifiedOn: string;
    note: string;
  };
  estimate: true;
  limitations: readonly string[];
}

export interface ModelsResponse {
  models: ModelDefinition[];
  pricing: typeof PRICING_CATALOG;
  limits: {
    maxCharactersPerField: number;
    maxExpectedOutputTokens: number;
  };
  limitations: readonly string[];
}

export class AnalysisService {
  constructor(private readonly tokenizers: TokenizerRegistry) {}

  listModels(): ModelsResponse {
    return {
      models: [...MODELS],
      pricing: PRICING_CATALOG,
      limits: {
        maxCharactersPerField: MAX_CHARACTERS_PER_FIELD,
        maxExpectedOutputTokens: MAX_EXPECTED_OUTPUT_TOKENS,
      },
      limitations: TOKEN_ESTIMATE_LIMITATIONS,
    };
  }

  count(request: CountRequest): CountResponse {
    const model = this.requireModel(request.model);
    const stats = this.statsFor(model, request.text);

    return {
      model: model.id,
      encoding: model.encoding,
      wordCount: stats.wordCount,
      characterCount: stats.characterCount,
      tokenCount: stats.tokenCount,
      estimate: true,
      limitations: TOKEN_ESTIMATE_LIMITATIONS,
    };
  }

  analyze(request: AnalyzeRequest): AnalyzeResponse {
    const model = this.requireModel(request.model);
    const systemPrompt = this.statsFor(model, request.systemPrompt);
    const userPrompt = this.statsFor(model, request.userPrompt);
    const context = this.statsFor(model, request.context);
    const totalInputTokens = systemPrompt.tokenCount + userPrompt.tokenCount + context.tokenCount;
    const costs = estimateCost(totalInputTokens, request.expectedOutputTokens, model);

    return {
      model: model.id,
      encoding: model.encoding,
      provider: model.provider,
      systemPromptTokens: systemPrompt.tokenCount,
      userPromptTokens: userPrompt.tokenCount,
      contextTokens: context.tokenCount,
      totalInputTokens,
      expectedOutputTokens: request.expectedOutputTokens,
      totalTokens: totalInputTokens + request.expectedOutputTokens,
      wordCount: systemPrompt.wordCount + userPrompt.wordCount + context.wordCount,
      characterCount:
        systemPrompt.characterCount + userPrompt.characterCount + context.characterCount,
      sections: { systemPrompt, userPrompt, context },
      estimatedInputCostUsd: costs.estimatedInputCostUsd,
      estimatedOutputCostUsd: costs.estimatedOutputCostUsd,
      totalEstimatedCostUsd: costs.totalEstimatedCostUsd,
      currency: 'USD',
      pricing: {
        inputPricePerMillionUsd: model.inputPricePerMillionUsd,
        outputPricePerMillionUsd: model.outputPricePerMillionUsd,
        cachedInputPricePerMillionUsd: model.cachedInputPricePerMillionUsd,
        tier: PRICING_CATALOG.tier,
        source: PRICING_CATALOG.source,
        verifiedOn: PRICING_CATALOG.verifiedOn,
        note: PRICING_CATALOG.note,
      },
      estimate: true,
      limitations: TOKEN_ESTIMATE_LIMITATIONS,
    };
  }

  /** Loads each configured encoding once so a bad catalog fails at startup. */
  warmTokenizers(): void {
    for (const model of MODELS) {
      this.tokensFor(model, '');
    }
  }

  private requireModel(modelId: string): ModelDefinition {
    const model = MODELS.find((item) => item.id === modelId);
    if (!model) {
      throw new AppError('UNSUPPORTED_MODEL', `Model "${modelId}" is not supported.`, 400, [
        {
          field: 'model',
          message: `Supported models: ${MODELS.map((item) => item.id).join(', ')}.`,
        },
      ]);
    }

    return model;
  }

  private statsFor(model: ModelDefinition, text: string): TextStats {
    return {
      wordCount: countWords(text),
      characterCount: countCharacters(text),
      tokenCount: this.tokensFor(model, text),
    };
  }

  private tokensFor(model: ModelDefinition, text: string): number {
    try {
      return this.tokenizers.countTokens(model.provider, model.encoding, text);
    } catch (error) {
      if (error instanceof TokenizerError) {
        const status = error.code === 'TOKENIZE_FAILED' ? 400 : 500;
        throw new AppError(error.code, error.message, status);
      }

      throw error;
    }
  }
}
