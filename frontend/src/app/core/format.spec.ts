import { formatCount, formatPricePerMillion, formatUsd } from './format';

describe('formatters', () => {
  it('formats token counts and missing values', () => {
    expect(formatCount(128000)).toBe('128,000');
    expect(formatCount(null)).toBe('—');
  });

  it('formats published per-million prices in dollars', () => {
    expect(formatPricePerMillion(2.5)).toBe('$2.50');
    expect(formatPricePerMillion(0.15)).toBe('$0.15');
    expect(formatPricePerMillion(0.025)).toBe('$0.025');
  });

  it('keeps small estimated costs visible', () => {
    expect(formatUsd(12.5)).toBe('$12.50');
    expect(formatUsd(0.0000125)).toBe('$0.0000125');
    expect(formatUsd(0.0050125)).toBe('$0.0050125');
    expect(formatUsd(null)).toBe('—');
  });
});
