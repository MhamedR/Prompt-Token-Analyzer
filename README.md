# Prompt Token Analyzer

A local web app that estimates how many tokens a prompt will use, and what that text may cost, across OpenAI, Anthropic, Google, Meta, Mistral, and DeepSeek. Text analysis works without an API key. A key is optional and is used only for a provider's token-counting endpoint, never to generate a completion.

## Architecture

The Angular app is a dashboard. The Express API owns tokenization, pricing, and cost math. The browser never hardcodes model prices.

```
Browser (Angular)
  │  GET  /api/models
  │  POST /api/tokens/count
  │  POST /api/tokens/analyze
  ▼
Express API
  ├─ Model catalog          prices and tokenizer keys, one entry per model
  ├─ Analysis service       section totals and USD estimate
  └─ Tokenizer registry     one TokenizerProvider per family
        ├─ OpenAI           js-tiktoken
        ├─ Anthropic        local Claude 3 tokenizer, or count_tokens when a key is set
        ├─ Google           local Gemini 1.5 tokenizer, or countTokens when a key is set
        ├─ Meta             Llama 3.1 tokenizer
        ├─ Mistral          Mistral Nemo tokenizer
        └─ DeepSeek         DeepSeek-V4 tokenizer
```

A new model that reuses a tokenizer key is a catalog row. A new provider is a class registered in `createTokenizerRegistry`. The analysis service does not import provider implementations.

Each result names the provider, model, tokenizer method, and accuracy: exact, approximate, or API-reported. Counts are not an invoice. Chat framing, tools, images, and audio are outside the local count.

## Folder structure

```
prompt-token-analyzer/
├── frontend/                 Angular 22 app
│   └── src/app/
│       ├── core/             API models, formatters, HTTP service
│       └── features/dashboard/
│           └── components/   model select, editor, sections, cards, costs, breakdown
├── backend/
│   ├── src/
│   │   ├── config/           environment and the model catalog
│   │   ├── domain/           word/character counts and the cost formula
│   │   ├── tokenizers/       TokenizerProvider implementations
│   │   ├── services/         count and analyze
│   │   ├── http/             validation and error responses
│   │   └── routes/           /api/models and /api/tokens
│   └── tests/                token, cost, and HTTP tests
├── package.json              convenience scripts
└── README.md
```

## Tokenizers

Providers do not share a tokenizer. None of these counts is a character ratio.

| Provider | Local method | Accuracy without a key | Optional count API |
| --- | --- | --- | --- |
| OpenAI | js-tiktoken `o200k_base` | Exact for that encoding | None. No key is used. |
| Anthropic | Claude 3 vocabulary | Approximate for Claude 4 and later | `POST /v1/messages/count_tokens` with `ANTHROPIC_API_KEY` |
| Google | Gemini 1.5 / Gemma 2 vocabulary | Approximate for current Gemini models | `countTokens` with `GEMINI_API_KEY` |
| Meta | Llama 3.1 vocabulary | Exact for Llama 3.1 and 3.3 plain text | None. Meta has no first-party price. |
| Mistral | Mistral Nemo vocabulary | Approximate for current Mistral models | None. |
| DeepSeek | DeepSeek-V4 vocabulary | Exact for V4 Pro. Approximate for V4.1 Flash. | None. |

OpenAI’s GPT-4o and GPT-4.1 models use [`js-tiktoken`](https://github.com/dqbd/tiktoken/tree/main/js) 1.0.x. The catalog sets `o200k_base` explicitly, and a unit test checks that the library agrees. The other local tokenizers come from the `@lenml/tokenizer-*` packages and encode text with special tokens turned off.

Anthropic's count endpoint and Gemini's `countTokens` endpoint only count tokens. They are not message or `generateContent` calls. If a key is set and the endpoint fails, the API falls back to the local tokenizer and labels that result approximate. Keys stay in the backend environment and are not returned by `GET /api/models`.

Compatibility limits:

- Plain-text totals should match tiktoken for the configured encoding. They still are not a bill.
- Each section is tokenized separately and the counts are added. Joining the strings and tokenizing once can differ by a few tokens, because byte-pair merges can cross a boundary.
- Chat role markers, separators, and reply priming are not included. OpenAI’s own guidance treats that overhead as model-dependent.
- A special-token marker such as `<|endoftext|>` is counted as that token instead of rejected.
- Images, audio, and tool definitions are not counted. GPT-4o and GPT-4.1 accept images.

An unknown model returns `400` with code `UNSUPPORTED_MODEL`. A provider with no tokenizer returns a clear error rather than a guessed count.

## Models and pricing

Prices live only in `backend/src/config/models.ts`. Each model has its own source. Rates below are uncached standard USD per 1,000,000 tokens, checked on **2026-10-31**. Cached, batch, regional, and peak-hour rates are not applied.

| Model | API id | Encoding | Input / 1M | Output / 1M | Lifecycle |
| --- | --- | --- | --- | --- | --- |
| GPT-4o | `gpt-4o` | `o200k_base` | $2.50 | $10.00 | Deprecated, shutdown 2027-01-14 |
| GPT-4o mini | `gpt-4o-mini` | `o200k_base` | $0.15 | $0.60 | Deprecated, shutdown 2027-01-14 |
| GPT-4.1 | `gpt-4.1` | `o200k_base` | $2.00 | $8.00 | Deprecated, shutdown 2027-01-14 |
| GPT-4.1 mini | `gpt-4.1-mini` | `o200k_base` | $0.40 | $1.60 | Deprecated, shutdown 2027-01-14 |
| GPT-4.1 nano | `gpt-4.1-nano` | `o200k_base` | $0.10 | $0.40 | Shut down 2026-10-23 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Claude 3 local | $2.00 | $10.00 | Current |
| Claude Haiku 4.5 | `claude-haiku-4-5` | Claude 3 local | $1.00 | $5.00 | Current |
| Claude Opus 4.6 | `claude-opus-4-6` | Claude 3 local | $5.00 | $25.00 | Current |
| Gemini 3.8 Flash | `gemini-3.8-flash` | Gemini 1.5 local | $0.75 | $3.75 | Intro rate through 2026-12-31 |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | Gemini 1.5 local | $0.30 | $2.50 | Current |
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | Gemini 1.5 local | $2.00 | $12.00 | Short-context rate |
| Llama 3.3 70B | `llama-3.3-70b` | Llama 3.1 | — | — | No first-party price |
| Llama 3.1 8B | `llama-3.1-8b` | Llama 3.1 | — | — | No first-party price |
| Mistral Small 4 | `mistral-small-2603` | Mistral Nemo | $0.15 | $0.60 | Current |
| Mistral Medium 3.5 | `mistral-medium-3.5` | Mistral Nemo | $1.50 | $7.50 | Current |
| Ministral 3 8B | `ministral-3-8b` | Mistral Nemo | $0.15 | $0.15 | Current |
| DeepSeek V4 Pro | `deepseek-v4-pro` | DeepSeek-V4 | $0.66 | $1.98 | Off-peak cache miss |
| DeepSeek Flash | `deepseek-flash` | DeepSeek-V4 | $0.15 | $0.60 | Off-peak cache miss |

OpenAI lifecycle follows the [deprecations page](https://developers.openai.com/api/docs/deprecations). Claude prices follow the [Claude pricing page](https://platform.claude.com/docs/en/about-claude/pricing). Gemini prices follow the [Gemini pricing page](https://ai.google.dev/gemini-api/docs/pricing). Mistral prices follow the [Mistral pricing page](https://docs.mistral.ai/inference/pricing). DeepSeek prices follow the [DeepSeek pricing page](https://api-docs.deepseek.com/quick_start/pricing) and use the off-peak cache-miss rate; peak hours cost twice as much. Meta does not publish a first-party token price. The verified date is shown in the UI.

```
Input cost  = (input tokens  / 1,000,000) × input price per million
Output cost = (output tokens / 1,000,000) × output price per million
Total       = input cost + output cost
```

Context windows shown in the UI are the published text windows: 128,000 for GPT-4o and GPT-4o mini (max output 16,384), and 1,047,576 for the GPT-4.1 family (max output 32,768).

## Requirements

- Node.js 22.12+ or 24.15+ (Angular 22). This project was built with Node 24.
- npm 11

No database. `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` are optional. See `backend/.env.example`.

## Run locally

Install once:

```bash
npm install --prefix backend
npm install --prefix frontend
```

Terminal 1, API on port 3000:

```bash
cd backend
cp .env.example .env   # optional; defaults are PORT 3000 and the Angular origin
npm test
npm run dev
```

Terminal 2, dashboard on port 4200:

```bash
cd frontend
npm test
npm start
```

Open [http://localhost:4200](http://localhost:4200).

From the repository root, `npm test` runs both suites, `npm run start:backend` starts the API, and `npm run start:frontend` starts the dashboard.

### Environment

`backend/.env.example`:

```
PORT=3000
CORS_ORIGIN=http://localhost:4200,http://127.0.0.1:4200
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

The frontend development API URL is `http://localhost:3000/api` in `frontend/src/environments/environment.ts`. A production build replaces it with `/api` so the API can be hosted on the same origin.

## API

`GET /api/models`

Returns the catalog, pricing source, field limits, and estimate limitations.

`POST /api/tokens/count`

```json
{ "model": "gpt-4o", "text": "Explain how artificial intelligence works" }
```

```json
{
  "model": "gpt-4o",
  "provider": "openai",
  "providerDisplayName": "OpenAI",
  "modelDisplayName": "GPT-4o",
  "tokenizerMethod": "js-tiktoken o200k_base",
  "accuracy": "exact",
  "countingOnly": true,
  "wordCount": 5,
  "characterCount": 41,
  "tokenCount": 5
}
```

`accuracy` is `exact`, `approximate`, or `api-reported`. `countingOnly` is always true: the request did not generate a completion. Word and character counts describe the text. An exact token count still omits chat framing, so it is not an invoice.

`POST /api/tokens/analyze`

```json
{
  "model": "gpt-4o",
  "systemPrompt": "You are a helpful assistant",
  "userPrompt": "Explain AI",
  "context": "Additional information",
  "expectedOutputTokens": 500
}
```

The response includes each section’s token count, `totalInputTokens`, `expectedOutputTokens`, `estimatedInputCostUsd`, `estimatedOutputCostUsd`, and `totalEstimatedCostUsd`.

Validation errors use HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "expectedOutputTokens", "message": "..." }]
  }
}
```

Unknown models use code `UNSUPPORTED_MODEL`. Invalid JSON uses `INVALID_JSON`.

## Tests

```bash
npm test --prefix backend
npm test --prefix frontend
```

Backend tests cover word and character counts, the cost formula, `o200k_base` parity with js-tiktoken (including the published `"tiktoken is great!"` → 6 tokens case), section totals, and the HTTP endpoints. Frontend tests cover the same text metrics, currency formatting, and the API client URLs.

## Extending the catalog

1. Add a class that implements `TokenizerProvider` in `backend/src/tokenizers/`.
2. Register it in `createTokenizerRegistry`.
3. Append a model in `backend/src/config/models.ts` with `provider`, `tokenizerKey`, and prices.

A model that reuses an existing `tokenizerKey` only needs the catalog entry. The dashboard reads `GET /api/models` and filters models by the selected provider. Prompt history, comparison, and CSV export are not in this version.
