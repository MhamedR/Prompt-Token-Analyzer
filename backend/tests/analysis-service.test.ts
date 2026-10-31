import { describe, expect, it } from 'vitest';
import { ModelCatalog } from '../src/config/model-catalog.js';
import { MODELS } from '../src/config/models.js';
import { AnalysisService } from '../src/services/analysis-service.js';
import { OpenAiTiktokenProvider } from '../src/tokenizers/openai-tiktoken-provider.js';
import { TokenizerRegistry } from '../src/tokenizers/tokenizer-registry.js';
import { parseAnalyzeBody, parseCountBody } from '../src/http/validation.js';

function createService(): AnalysisService {
  return new AnalysisService(new ModelCatalog(), new TokenizerRegistry([new OpenAiTiktokenProvider()]));
}

describe('AnalysisService', () => {
  const service = createService();

  it('returns actual token stats for a prompt', async () => {
    const result = await service.count({
      model: 'gpt-4o',
      text: 'Explain how artificial intelligence works',
    });

    expect(result.model).toBe('gpt-4o');
    expect(result.wordCount).toBe(5);
    expect(result.characterCount).toBe(41);
    expect(result.tokenCount).toBe(5);
    expect(result.accuracy).toBe('exact');
    expect(result.countingOnly).toBe(true);
  });

  it('sums section tokens independently and prices the selected model', async () => {
    const result = await service.analyze({
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
    expect(result.estimatedInputCostUsd).not.toBeNull();
    expect(result.estimatedOutputCostUsd).not.toBeNull();
    expect(result.totalEstimatedCostUsd).toBe(
      roundUsd((result.estimatedInputCostUsd ?? 0) + (result.estimatedOutputCostUsd ?? 0)),
    );
    expect(result.currency).toBe('USD');
  });

  it('keeps prices only on the model catalog', () => {
    const listed = service.listModels().models.map((model) => model.id);
    expect(listed).toEqual(MODELS.map((model) => model.id));
    expect(service.listModels().pricing.verifiedOn).toBe('2026-10-31');
  });

  it('rejects an unknown model', async () => {
    await expect(service.count({ model: 'not-a-model', text: 'Hello' })).rejects.toThrow(/not supported/);
  });

  it('does not price Llama because Meta has no first-party rate', async () => {
    const full = new AnalysisService(new ModelCatalog(), new TokenizerRegistry([new OpenAiTiktokenProvider()]));
    expect(full.listModels().models.find((item) => item.id === 'llama-3.3-70b')?.inputPricePerMillionUsd).toBeNull();
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
