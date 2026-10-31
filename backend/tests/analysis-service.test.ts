import { describe, expect, it } from 'vitest';
import { MODELS } from '../src/config/models.js';
import { AnalysisService } from '../src/services/analysis-service.js';
import { OpenAiTiktokenProvider } from '../src/tokenizers/openai-tiktoken-provider.js';
import { TokenizerRegistry } from '../src/tokenizers/tokenizer-registry.js';
import { parseAnalyzeBody, parseCountBody } from '../src/http/validation.js';

function createService(): AnalysisService {
  return new AnalysisService(new TokenizerRegistry([new OpenAiTiktokenProvider()]));
}

describe('AnalysisService', () => {
  const service = createService();

  it('returns actual token stats for a prompt', () => {
    const result = service.count({
      model: 'gpt-4o',
      text: 'Explain how artificial intelligence works',
    });

    expect(result.model).toBe('gpt-4o');
    expect(result.wordCount).toBe(5);
    expect(result.characterCount).toBe(41);
    expect(result.tokenCount).toBe(5);
    expect(result.estimate).toBe(true);
  });

  it('sums section tokens independently and prices the selected model', () => {
    const result = service.analyze({
      model: 'gpt-4o',
      systemPrompt: 'You are a helpful assistant',
      userPrompt: 'Explain AI',
      context: 'Additional information',
      expectedOutputTokens: 500,
    });

    expect(result.systemPromptTokens).toBeGreaterThan(0);
    expect(result.userPromptTokens).toBeGreaterThan(0);
    expect(result.contextTokens).toBeGreaterThan(0);
    expect(result.totalInputTokens).toBe(
      result.systemPromptTokens + result.userPromptTokens + result.contextTokens,
    );
    expect(result.expectedOutputTokens).toBe(500);
    expect(result.totalTokens).toBe(result.totalInputTokens + 500);
    expect(result.estimatedInputCostUsd).toBe(
      roundUsd((result.totalInputTokens / 1_000_000) * 2.5),
    );
    expect(result.estimatedOutputCostUsd).toBe(roundUsd((500 / 1_000_000) * 10));
    expect(result.totalEstimatedCostUsd).toBe(
      roundUsd(result.estimatedInputCostUsd + result.estimatedOutputCostUsd),
    );
    expect(result.currency).toBe('USD');
  });

  it('keeps prices only on the model catalog', () => {
    const listed = service.listModels().models.map((model) => model.id);
    expect(listed).toEqual(MODELS.map((model) => model.id));
    expect(service.listModels().pricing.verifiedOn).toBe('2026-10-31');
  });

  it('rejects an unknown model', () => {
    expect(() => service.count({ model: 'claude-3', text: 'Hello' })).toThrow(/not supported/);
  });
});

describe('request validation', () => {
  it('accepts a count request', () => {
    expect(parseCountBody({ model: ' gpt-4o ', text: '' })).toEqual({
      model: 'gpt-4o',
      text: '',
    });
  });

  it('collects analyze validation errors', () => {
    expect(() =>
      parseAnalyzeBody({
        model: '',
        systemPrompt: 1,
        userPrompt: 'ok',
        context: 'ok',
        expectedOutputTokens: -5,
      }),
    ).toThrow(/validation failed/i);
  });

  it('rejects a non-object body', () => {
    expect(() => parseCountBody(null)).toThrow(/JSON object/);
  });
});

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
}
