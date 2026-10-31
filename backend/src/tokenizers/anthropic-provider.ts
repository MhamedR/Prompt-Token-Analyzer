import type { ModelDefinition } from '../config/models.js';
import { postJson, readInteger } from './count-api.js';
import { LocalTokenizerProvider, type LocalTokenizerSpec } from './local-provider.js';
import { TokenizerError, type TokenCount } from './tokenizer-provider.js';

const LOCAL_NOTE =
  'No ANTHROPIC_API_KEY is set, so this uses the published Claude 3 tokenizer locally. Claude 4.7 and later use a newer vocabulary and can be about 30 percent higher. Set the key to call the count_tokens endpoint. That endpoint only counts tokens and does not generate a reply.';

const API_NOTE =
  'Counted by Anthropic POST /v1/messages/count_tokens. That endpoint does not create a message. Anthropic describes the result as an estimate that can differ slightly from billed usage, and the request includes the user-message wrapper the endpoint requires.';

const FALLBACK_NOTE =
  'The Anthropic token-counting API did not respond, so the local Claude 3 tokenizer was used instead. That vocabulary is approximate for current Claude models. No completion was requested.';

const LOCAL: LocalTokenizerSpec = {
  key: 'claude-3',
  method: 'Claude 3 tokenizer (local)',
  accuracy: 'approximate',
  note: LOCAL_NOTE,
  load: () => import('@lenml/tokenizer-claude'),
};

export class AnthropicTokenizerProvider extends LocalTokenizerProvider {
  constructor(private readonly apiKey: string | null) {
    super('anthropic', 'Anthropic', 'ANTHROPIC_API_KEY', [LOCAL], apiKey !== null, apiKey ? 'count-api' : 'local');
  }

  override async countTokens(model: ModelDefinition, text: string): Promise<TokenCount> {
    if (text.length === 0) {
      return this.empty(this.apiKey ? 'api-reported' : 'approximate');
    }

    if (!this.apiKey) {
      return super.countTokens(model, text);
    }

    try {
      const payload = await postJson(
        'https://api.anthropic.com/v1/messages/count_tokens',
        {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        {
          model: model.id,
          messages: [{ role: 'user', content: text }],
        },
      );

      return {
        tokenCount: readInteger(payload, 'input_tokens'),
        accuracy: 'api-reported',
        method: 'Anthropic count_tokens API',
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
        method: 'Claude 3 tokenizer (local fallback)',
        accuracyNote: FALLBACK_NOTE,
      };
    }
  }

  private empty(accuracy: TokenCount['accuracy']): TokenCount {
    return {
      tokenCount: 0,
      accuracy,
      method: accuracy === 'api-reported' ? 'Anthropic count_tokens API' : LOCAL.method,
      accuracyNote: accuracy === 'api-reported' ? API_NOTE : LOCAL.note,
      countingOnly: true,
    };
  }
}
