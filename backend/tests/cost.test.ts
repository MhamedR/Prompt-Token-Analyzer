import { describe, expect, it } from 'vitest';
import { estimateCost } from '../src/domain/cost.js';

const prices = {
  inputPricePerMillionUsd: 2.5,
  outputPricePerMillionUsd: 10,
};

describe('estimateCost', () => {
  it('prices one million input and output tokens at the configured rates', () => {
    const cost = estimateCost(1_000_000, 1_000_000, prices);

    expect(cost.estimatedInputCostUsd).toBe(2.5);
    expect(cost.estimatedOutputCostUsd).toBe(10);
    expect(cost.totalEstimatedCostUsd).toBe(12.5);
  });

  it('scales partial token counts by the per-million price', () => {
    const cost = estimateCost(2_000, 500, {
      inputPricePerMillionUsd: 0.15,
      outputPricePerMillionUsd: 0.6,
    });

    expect(cost.estimatedInputCostUsd).toBe(0.0003);
    expect(cost.estimatedOutputCostUsd).toBe(0.0003);
    expect(cost.totalEstimatedCostUsd).toBe(0.0006);
  });

  it('returns zero when both token counts are zero', () => {
    expect(estimateCost(0, 0, prices)).toEqual({
      estimatedInputCostUsd: 0,
      estimatedOutputCostUsd: 0,
      totalEstimatedCostUsd: 0,
    });
  });

  it('rejects negative token counts and prices', () => {
    expect(() => estimateCost(-1, 0, prices)).toThrow(/inputTokens/);
    expect(() =>
      estimateCost(0, 1, { inputPricePerMillionUsd: -1, outputPricePerMillionUsd: 1 }),
    ).toThrow(/inputPricePerMillionUsd/);
  });
});
