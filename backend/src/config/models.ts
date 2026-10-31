import {
  PRICING_SOURCE,
  PRICING_TIER,
  PRICING_VERIFIED_ON,
} from '../domain/limits.js';

/**
 * Supported providers. Only OpenAI is wired to a tokenizer today.
 * Add anthropic, google, or meta models after registering a tokenizer for that provider.
 */
export const MODEL_PROVIDERS = ['openai', 'anthropic', 'google', 'meta'] as const;
export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export type ModelLifecycle = 'deprecated' | 'shutdown';

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: ModelProvider;
  /** Tokenizer encoding name. OpenAI GPT-4o and GPT-4.1 models use o200k_base. */
  encoding: string;
  /** USD per 1,000,000 uncached input tokens. Standard tier. */
  inputPricePerMillionUsd: number;
  /** USD per 1,000,000 output tokens. Standard tier. */
  outputPricePerMillionUsd: number;
  /** Published cached-input rate. Not used in estimates. */
  cachedInputPricePerMillionUsd: number | null;
  contextWindow: number;
  maxOutputTokens: number;
  lifecycle: ModelLifecycle;
  /** ISO date from OpenAI's deprecation notice, when one is published. */
  shutdownDate: string | null;
  lifecycleNote: string;
}

/**
 * Pricing and tokenizer settings live only in this file.
 * Rates are OpenAI standard text-token prices, verified 2026-10-31:
 * https://developers.openai.com/api/docs/pricing
 * Lifecycle notes follow https://developers.openai.com/api/docs/deprecations
 */
export const MODELS: readonly ModelDefinition[] = [
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    encoding: 'o200k_base',
    inputPricePerMillionUsd: 2.5,
    outputPricePerMillionUsd: 10,
    cachedInputPricePerMillionUsd: 1.25,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    lifecycle: 'deprecated',
    shutdownDate: '2027-01-14',
    lifecycleNote:
      'Deprecated. OpenAI plans to remove GPT-4o from the API on January 14, 2027. The standard price is still published and is used for this estimate.',
  },
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o mini',
    provider: 'openai',
    encoding: 'o200k_base',
    inputPricePerMillionUsd: 0.15,
    outputPricePerMillionUsd: 0.6,
    cachedInputPricePerMillionUsd: 0.075,
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    lifecycle: 'deprecated',
    shutdownDate: '2027-01-14',
    lifecycleNote:
      'Deprecated. OpenAI plans to remove GPT-4o mini from the API on January 14, 2027. The standard price is still published and is used for this estimate.',
  },
  {
    id: 'gpt-4.1',
    displayName: 'GPT-4.1',
    provider: 'openai',
    encoding: 'o200k_base',
    inputPricePerMillionUsd: 2,
    outputPricePerMillionUsd: 8,
    cachedInputPricePerMillionUsd: 0.5,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    lifecycle: 'deprecated',
    shutdownDate: '2027-01-14',
    lifecycleNote:
      'Deprecated. OpenAI plans to remove GPT-4.1 from the API on January 14, 2027. The standard price is still published and is used for this estimate.',
  },
  {
    id: 'gpt-4.1-mini',
    displayName: 'GPT-4.1 mini',
    provider: 'openai',
    encoding: 'o200k_base',
    inputPricePerMillionUsd: 0.4,
    outputPricePerMillionUsd: 1.6,
    cachedInputPricePerMillionUsd: 0.1,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    lifecycle: 'deprecated',
    shutdownDate: '2027-01-14',
    lifecycleNote:
      'Deprecated. OpenAI plans to remove GPT-4.1 mini from the API on January 14, 2027. The standard price is still published and is used for this estimate.',
  },
  {
    id: 'gpt-4.1-nano',
    displayName: 'GPT-4.1 nano',
    provider: 'openai',
    encoding: 'o200k_base',
    inputPricePerMillionUsd: 0.1,
    outputPricePerMillionUsd: 0.4,
    cachedInputPricePerMillionUsd: 0.025,
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    lifecycle: 'shutdown',
    shutdownDate: '2026-10-23',
    lifecycleNote:
      'Shut down on October 23, 2026. The last published standard price is kept so older prompts can still be estimated. The API no longer serves this model.',
  },
];

export const PRICING_CATALOG = {
  source: PRICING_SOURCE,
  verifiedOn: PRICING_VERIFIED_ON,
  tier: PRICING_TIER,
  note: 'Estimates use standard uncached input and output prices in USD. Cached input, batch, regional, and priority rates are not applied. Prices can change.',
} as const;

export function findModel(modelId: string): ModelDefinition | undefined {
  return MODELS.find((model) => model.id === modelId);
}
