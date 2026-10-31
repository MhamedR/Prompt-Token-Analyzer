export const MAX_CHARACTERS_PER_FIELD = 400_000;
export const MAX_EXPECTED_OUTPUT_TOKENS = 2_000_000;

export const PRICING_SOURCE = 'https://developers.openai.com/api/docs/pricing';
export const PRICING_VERIFIED_ON = '2026-10-31';
export const PRICING_TIER = 'OpenAI standard text tokens';

export const TOKEN_ESTIMATE_LIMITATIONS = [
  'Token counts are estimates of plain text. They are not the exact number of tokens an API request will bill.',
  'Counts use js-tiktoken, a JavaScript port of OpenAI tiktoken, with the encoding configured for each model. GPT-4o and GPT-4.1 family models use o200k_base. Plain-text totals should match that encoding, but chat formatting can still differ.',
  'Each section is tokenized on its own and the counts are added. That matches separate chat messages better than tokenizing one concatenated string, because byte-pair merges can cross a boundary when texts are joined.',
  'Chat role markers, message separators, and reply priming add tokens that are not part of the text. The overhead depends on the model snapshot and can change.',
  'Tool definitions, images, audio, and other multimodal inputs are not counted. GPT-4o and GPT-4.1 accept images, and those inputs are billed separately from this text estimate.',
  'Prices are published standard uncached rates per 1,000,000 tokens. Cached-input discounts, batch pricing, regional uplifts, and priority or fast tiers are not applied. Published prices can change.',
  'This service does not call a model API and does not need an API key. It cannot report invoice usage.',
] as const;
