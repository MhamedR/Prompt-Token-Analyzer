import { getEncoding, getEncodingNameForModel } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { MODELS } from '../src/config/models.js';
import { OpenAiTiktokenProvider } from '../src/tokenizers/openai-tiktoken-provider.js';
import { TokenizerRegistry } from '../src/tokenizers/tokenizer-registry.js';

describe('OpenAI tokenization', () => {
  const provider = new OpenAiTiktokenProvider();

  it('matches the published o200k_base count for a known string', () => {
    expect(provider.countTokens('o200k_base', 'tiktoken is great!')).toBe(6);
  });

  it('matches js-tiktoken directly and does not use a character ratio', () => {
    const text = 'Explain how artificial intelligence works';
    const encoding = getEncoding('o200k_base');
    const actual = provider.countTokens('o200k_base', text);

    expect(actual).toBe(encoding.encode(text).length);
    expect(actual).not.toBe(Math.round(text.length / 4));
    expect(actual).not.toBe(Math.ceil(text.length / 4));
  });

  it('counts an empty string as zero tokens', () => {
    expect(provider.countTokens('o200k_base', '')).toBe(0);
  });

  it('counts special-token markers as text instead of rejecting the prompt', () => {
    expect(provider.countTokens('o200k_base', 'Keep <|endoftext|> in the prompt')).toBeGreaterThan(0);
  });

  it('uses the encoding js-tiktoken assigns to every configured model', () => {
    for (const model of MODELS) {
      expect(model.encoding).toBe(
        getEncodingNameForModel(model.id as Parameters<typeof getEncodingNameForModel>[0]),
      );
      expect(provider.supportsEncoding(model.encoding)).toBe(true);
    }
  });

  it('rejects providers that have no tokenizer yet', () => {
    const registry = new TokenizerRegistry([provider]);
    expect(() => registry.countTokens('anthropic', 'o200k_base', 'hello')).toThrow(/anthropic/);
  });
});
