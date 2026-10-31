import type { ModelDefinition } from '../config/models.js';
import { postJson, readInteger } from './count-api.js';
import { LocalTokenizerProvider, type LocalTokenizerSpec } from './local-provider.js';
import { TokenizerError, type TokenCount } from './tokenizer-provider.js';

const LOCAL_NOTE =
  'No GEMINI_API_KEY is set, so this uses the Gemma 2 / Gemini 1.5 tokenizer locally. Current Gemini 3 models may not share that vocabulary. Set the key to call countTokens. That endpoint only counts tokens and does not call generateContent.';

const API_NOTE =
  'Counted by the Gemini countTokens endpoint. This is not a generateContent call. The endpoint can include a small amount of request structure beyond the raw text.';

const FALLBACK_NOTE =
  'The Gemini countTokens endpoint did not respond, so the local Gemini 1.5 tokenizer was used instead. That count is approximate for current Gemini models. No completion was requested.';

const LOCAL: LocalTokenizerSpec = {
  key: 'gemini-1.5',
  method: 'Gemini 1.5 tokenizer (local)',
  accuracy: 'approximate',
  note: LOCAL_NOTE,
  load: () => import('@lenml/tokenizer-gemini'),
};

export class GeminiTokenizerProvider extends LocalTokenizerProvider {
  constructor(private readonly apiKey: string | null) {
    super('google', 'Google', 'GEMINI_API_KEY', [LOCAL], apiKey !== null, apiKey ? 'count-api' : 'local');
  }

  override async countTokens(model: ModelDefinition, text: string): Promise<TokenCount> {
    if (text.length === 0) {
      return {
        tokenCount: 0,
        accuracy: this.apiKey ? 'api-reported' : 'approximate',
        method: this.apiKey ? 'Gemini countTokens API' : LOCAL.method,
        accuracyNote: this.apiKey ? API_NOTE : LOCAL.note,
        countingOnly: true,
      };
    }

    if (!this.apiKey) {
      return super.countTokens(model, text);
    }

    try {
      const payload = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.id)}:countTokens`,
        { 'x-goog-api-key': this.apiKey },
        { contents: [{ parts: [{ text }] }] },
      );

      return {
        tokenCount: readInteger(payload, 'totalTokens'),
        accuracy: 'api-reported',
        method: 'Gemini countTokens API',
        accuracyNote: API_NOTE,
        countingOnly: true,
      };
    } catch (error) {
      if (!(error instanceof TokenizerError)) {
        throw error;
      }

      const local = await super.countTokens(model, text);
      return {
        ...local,
        method: 'Gemini 1.5 tokenizer (local fallback)',
        accuracyNote: FALLBACK_NOTE,
      };
    }
  }
}
