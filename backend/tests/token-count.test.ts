import { getEncoding, getEncodingNameForModel } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { MODELS, type ModelDefinition } from '../src/config/models.js';
import { createTokenizerRegistry } from '../src/tokenizers/create-registry.js';
import { OpenAiTiktokenProvider } from '../src/tokenizers/openai-tiktoken-provider.js';
import { TokenizerRegistry } from '../src/tokenizers/tokenizer-registry.js';
import { env } from '../src/config/env.js';

const gpt4o = MODELS.find((model) => model.id === 'gpt-4o');
if (!gpt4o) {
  throw new Error('gpt-4o is missing from the catalog');
}

describe('OpenAI tokenization', () => {
  const provider = new OpenAiTiktokenProvider();

  it('matches the published o200k_base count for a known string', async () => {
    const result = await provider.countTokens(gpt4o, 'tiktoken is great!');
    expect(result.tokenCount).toBe(6);
    expect(result.accuracy).toBe('exact');
    expect(result.countingOnly).toBe(true);
  });

  it('matches js-tiktoken directly and does not use a character ratio', async () => {
    const text = 'Explain how artificial intelligence works';
    const encoding = getEncoding('o200k_base');
    const actual = await provider.countTokens(gpt4o, text);

    expect(actual.tokenCount).toBe(encoding.encode(text).length);
    expect(actual.tokenCount).not.toBe(Math.round(text.length / 4));
    expect(actual.tokenCount).not.toBe(Math.ceil(text.length / 4));
  });

  it('counts an empty string as zero tokens', async () => {
    expect((await provider.countTokens(gpt4o, '')).tokenCount).toBe(0);
  });

  it('counts special-token markers as text instead of rejecting the prompt', async () => {
    const result = await provider.countTokens(gpt4o, 'Keep <|endoftext|> in the prompt');
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  it('uses the encoding js-tiktoken assigns to every configured OpenAI model', () => {
    for (const model of MODELS.filter((item) => item.provider === 'openai')) {
      expect(model.tokenizerKey).toBe(
        getEncodingNameForModel(model.id as Parameters<typeof getEncodingNameForModel>[0]),
      );
      expect(provider.supports(model)).toBe(true);
    }
  });

  it('rejects providers that have no tokenizer yet', async () => {
    const registry = new TokenizerRegistry([provider]);
    const foreign = { ...gpt4o, provider: 'anthropic', tokenizerKey: 'claude-3' } as ModelDefinition;
    await expect(registry.countTokens(foreign, 'hello')).rejects.toThrow(/anthropic/);
  });
});

describe('provider-specific tokenizers', () => {
  const registry = createTokenizerRegistry({ ...env, anthropicApiKey: null, geminiApiKey: null });

  it('counts the same sentence differently for OpenAI and Llama', async () => {
    const text = 'Explain how artificial intelligence works';
    const openai = await registry.countTokens(model('gpt-4o'), text);
    const llama = await registry.countTokens(model('llama-3.1-8b'), text);

    expect(openai.tokenCount).toBe(5);
    expect(llama.tokenCount).not.toBe(openai.tokenCount);
    expect(llama.accuracy).toBe('exact');
    expect(llama.method).toContain('Llama 3.1');
    expect(llama.countingOnly).toBe(true);
  });

  it('labels Claude and Gemini local counts as approximate when no API key is set', async () => {
    const text = 'Hello from the analyzer';
    const claude = await registry.countTokens(model('claude-sonnet-5-5'), text);
    const gemini = await registry.countTokens(model('gemini-3.8-flash'), text);
    const mistral = await registry.countTokens(model('mistral-small-2603'), text);
    const deepseek = await registry.countTokens(model('deepseek-v4-pro'), text);

    expect(claude.accuracy).toBe('approximate');
    expect(claude.method).toContain('Claude 3');
    expect(gemini.accuracy).toBe('approximate');
    expect(gemini.method).toContain('Gemini 1.5');
    expect(mistral.accuracy).toBe('approximate');
    expect(mistral.method).toContain('Mistral Nemo');
    expect(deepseek.accuracy).toBe('exact');
    expect(deepseek.method).toContain('DeepSeek-V4');
    expect(new Set([claude.method, gemini.method, mistral.method, deepseek.method]).size).toBe(4);
    expect([claude, gemini, mistral, deepseek].every((result) => result.tokenCount > 0)).toBe(true);
  });
});

function model(id: string): ModelDefinition {
  const found = MODELS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Missing model ${id}`);
  }
  return found;
}
