export const MAX_CHARACTERS_PER_FIELD = 400_000;
export const MAX_EXPECTED_OUTPUT_TOKENS = 2_000_000;

export const PRICING_VERIFIED_ON = '2026-10-31';

export const TOKEN_ESTIMATE_LIMITATIONS = [
  'Each provider uses its own tokenizer. Counts are not converted from characters.',
  'A count is exact only for the plain-text vocabulary named in the result. Approximate means the local vocabulary may not be the current model vocabulary. API-reported means a provider token-counting endpoint returned the number.',
  'Token-counting endpoints are not generation calls. This service never calls a completion, message, or generateContent endpoint.',
  'Each section is tokenized on its own and the counts are added. Joining the strings first can change the total because merges can cross a boundary.',
  'Chat templates, role markers, tool definitions, images, and audio are not included unless a count endpoint adds request structure of its own. That case is described on the result.',
  'Prices are each model\'s published uncached standard rate and can change. Cached input, batch, regional, and peak-hour rates are not applied. Meta has no first-party token price.',
  'An API key is optional. Local tokenizers run without one. A key is used only for a provider\'s token-counting endpoint and is never sent to the browser.',
] as const;
