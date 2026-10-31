export interface TokenPrices {
  inputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
}

export interface CostEstimate {
  estimatedInputCostUsd: number;
  estimatedOutputCostUsd: number;
  totalEstimatedCostUsd: number;
}

const USD_SCALE = 100_000_000;

export function roundUsd(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Cost must be a finite number.');
  }

  return Math.round((value + Number.EPSILON) * USD_SCALE) / USD_SCALE;
}

/**
 * Input cost = (input tokens / 1,000,000) × input price per million.
 * Output cost = (output tokens / 1,000,000) × output price per million.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  prices: TokenPrices,
): CostEstimate {
  assertTokenCount(inputTokens, 'inputTokens');
  assertTokenCount(outputTokens, 'outputTokens');
  assertPrice(prices.inputPricePerMillionUsd, 'inputPricePerMillionUsd');
  assertPrice(prices.outputPricePerMillionUsd, 'outputPricePerMillionUsd');

  const estimatedInputCostUsd = roundUsd((inputTokens / 1_000_000) * prices.inputPricePerMillionUsd);
  const estimatedOutputCostUsd = roundUsd(
    (outputTokens / 1_000_000) * prices.outputPricePerMillionUsd,
  );

  return {
    estimatedInputCostUsd,
    estimatedOutputCostUsd,
    totalEstimatedCostUsd: roundUsd(estimatedInputCostUsd + estimatedOutputCostUsd),
  };
}

function assertTokenCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function assertPrice(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
}
