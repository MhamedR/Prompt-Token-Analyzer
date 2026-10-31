import type { Env } from '../config/env.js';
import { AnthropicTokenizerProvider } from './anthropic-provider.js';
import { GeminiTokenizerProvider } from './gemini-provider.js';
import { LocalTokenizerProvider } from './local-provider.js';
import { OpenAiTiktokenProvider } from './openai-tiktoken-provider.js';
import { TokenizerRegistry } from './tokenizer-registry.js';

const LLAMA_NOTE =
  'Plain text is counted with the Llama 3.1 tokenizer and no special tokens. Llama 3.1 and 3.3 share that vocabulary. Chat templates are not applied. Meta does not sell a first-party token API, so no completion is called.';

const MISTRAL_NOTE =
  'Plain text is counted with the Mistral Nemo tokenizer. Current Mistral and Ministral models may use a newer Tekken vocabulary, so treat this as approximate. No Mistral API is called.';

const DEEPSEEK_V4_NOTE =
  'Plain text is counted with the DeepSeek-V4 tokenizer and no special tokens. Chat templates are not applied. This does not call the DeepSeek API.';

const DEEPSEEK_FLASH_NOTE =
  'Plain text is counted with the DeepSeek-V4 tokenizer. deepseek-flash is V4.1 and may not match that vocabulary exactly. This does not call the DeepSeek API.';

export function createTokenizerRegistry(env: Env): TokenizerRegistry {
  return new TokenizerRegistry([
    new OpenAiTiktokenProvider(),
    new AnthropicTokenizerProvider(env.anthropicApiKey),
    new GeminiTokenizerProvider(env.geminiApiKey),
    new LocalTokenizerProvider('meta', 'Meta', null, [
      {
        key: 'llama-3.1',
        method: 'Llama 3.1 tokenizer (local)',
        accuracy: 'exact',
        note: LLAMA_NOTE,
        load: () => import('@lenml/tokenizer-llama3_1'),
      },
    ]),
    new LocalTokenizerProvider('mistral', 'Mistral', null, [
      {
        key: 'mistral-nemo',
        method: 'Mistral Nemo tokenizer (local)',
        accuracy: 'approximate',
        note: MISTRAL_NOTE,
        load: () => import('@lenml/tokenizer-mistral_nemo'),
      },
    ]),
    new LocalTokenizerProvider('deepseek', 'DeepSeek', null, [
      {
        key: 'deepseek-v4',
        method: 'DeepSeek-V4 tokenizer (local)',
        accuracy: 'exact',
        note: DEEPSEEK_V4_NOTE,
        load: () => import('@lenml/tokenizer-deepseek_v4'),
      },
      {
        key: 'deepseek-v4-flash',
        cacheKey: 'deepseek-v4',
        method: 'DeepSeek-V4 tokenizer for V4.1 Flash (local)',
        accuracy: 'approximate',
        note: DEEPSEEK_FLASH_NOTE,
        load: () => import('@lenml/tokenizer-deepseek_v4'),
      },
    ]),
  ]);
}
