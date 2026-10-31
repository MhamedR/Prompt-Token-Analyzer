export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'meta' | 'mistral' | 'deepseek';
export type ModelLifecycle = 'current' | 'deprecated' | 'shutdown';
export type TokenAccuracy = 'exact' | 'approximate' | 'api-reported';

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: ModelProvider;
  providerDisplayName: string;
  tokenizerKey: string;
  inputPricePerMillionUsd: number | null;
  outputPricePerMillionUsd: number | null;
  cachedInputPricePerMillionUsd: number | null;
  priceSource: string;
  priceVerifiedOn: string;
  priceNote: string;
  contextWindow: number;
  maxOutputTokens: number;
  lifecycle: ModelLifecycle;
  shutdownDate: string | null;
  lifecycleNote: string;
}

export interface ProviderStatus {
  id: string;
  displayName: string;
  counting: 'local' | 'count-api';
  apiKeyConfigured: boolean;
  apiKeyEnv: string | null;
}

export interface PricingCatalog {
  verifiedOn: string;
  note: string;
}

export interface ApiLimits {
  maxCharactersPerField: number;
  maxExpectedOutputTokens: number;
}

export interface ModelsResponse {
  models: ModelDefinition[];
  providers: ProviderStatus[];
  pricing: PricingCatalog;
  limits: ApiLimits;
  limitations: string[];
}

export interface TokenMetadata {
  providerDisplayName: string;
  modelDisplayName: string;
  tokenizerMethod: string;
  accuracy: TokenAccuracy;
  accuracyNote: string;
  countingOnly: true;
}

export interface TokenCountResponse extends TokenMetadata {
  model: string;
  provider: ModelProvider;
  wordCount: number;
  characterCount: number;
  tokenCount: number;
  limitations: string[];
}

export interface TextStats {
  wordCount: number;
  characterCount: number;
  tokenCount: number;
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
  provider: ModelProvider;
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
  limitations: string[];
}
