export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'meta';
export type ModelLifecycle = 'deprecated' | 'shutdown';

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: ModelProvider;
  encoding: string;
  inputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
  cachedInputPricePerMillionUsd: number | null;
  contextWindow: number;
  maxOutputTokens: number;
  lifecycle: ModelLifecycle;
  shutdownDate: string | null;
  lifecycleNote: string;
}

export interface PricingCatalog {
  source: string;
  verifiedOn: string;
  tier: string;
  note: string;
}

export interface ApiLimits {
  maxCharactersPerField: number;
  maxExpectedOutputTokens: number;
}

export interface ModelsResponse {
  models: ModelDefinition[];
  pricing: PricingCatalog;
  limits: ApiLimits;
  limitations: string[];
}

export interface TokenCountResponse {
  model: string;
  encoding: string;
  wordCount: number;
  characterCount: number;
  tokenCount: number;
  estimate: true;
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

export interface AnalyzeResponse {
  model: string;
  encoding: string;
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
  limitations: string[];
}
