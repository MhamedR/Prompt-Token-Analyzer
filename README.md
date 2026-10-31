# Prompt Token Analyzer

A local web app that estimates how many tokens a prompt will use and what that text may cost on popular OpenAI models. It does not call a model API and does not need an API key.

## Architecture

The Angular app is a dashboard. The Express API owns tokenization, pricing, and cost math. The browser never hardcodes model prices.

```
Browser (Angular)
  │  GET  /api/models
  │  POST /api/tokens/count
  │  POST /api/tokens/analyze
  ▼
Express API
  ├─ Model catalog          prices, encoding, lifecycle
  ├─ Analysis service       section totals and USD estimate
  └─ Tokenizer registry     one provider per model family
        └─ OpenAI           js-tiktoken (o200k_base / cl100k_base / …)
```

Adding Anthropic, Google, or Meta later means two steps: implement a `TokenizerProvider`, then append models to the catalog. The HTTP API and the dashboard already treat the catalog as data.

Counts are estimates of plain text. They are not the number of tokens an API invoice will show. Chat framing, tools, images, and audio are outside this count. The dashboard says so, and every token response includes the same limitations.

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
│   │   ├── tokenizers/       provider interface and js-tiktoken
│   │   ├── services/         count and analyze
│   │   ├── http/             validation and error responses
│   │   └── routes/           /api/models and /api/tokens
│   └── tests/                token, cost, and HTTP tests
├── package.json              convenience scripts
└── README.md
```

## Tokenizer

OpenAI’s GPT-4o and GPT-4.1 models use the `o200k_base` encoding. This API counts with [`js-tiktoken`](https://github.com/dqbd/tiktoken/tree/main/js) 1.0.x, a pure JavaScript port of OpenAI’s [tiktoken](https://github.com/openai/tiktoken) byte-pair encoder. It is not a character-to-token ratio.

`js-tiktoken` maps `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, and `gpt-4.1-nano` to `o200k_base`. The catalog sets that encoding explicitly, and a unit test checks that the library agrees. `cl100k_base` is available for older GPT-4 and GPT-3.5 models, but those models are not in the dropdown.

Compatibility limits:

- Plain-text totals should match tiktoken for the configured encoding. They still are not a bill.
- Each section is tokenized separately and the counts are added. Joining the strings and tokenizing once can differ by a few tokens, because byte-pair merges can cross a boundary.
- Chat role markers, separators, and reply priming are not included. OpenAI’s own guidance treats that overhead as model-dependent.
- A special-token marker such as `<|endoftext|>` is counted as that token instead of rejected.
- Images, audio, and tool definitions are not counted. GPT-4o and GPT-4.1 accept images.

An unknown model returns `400` with code `UNSUPPORTED_MODEL`. A provider with no tokenizer returns a clear error rather than a guessed count.

## Models and pricing

Prices live only in `backend/src/config/models.ts`. They are OpenAI **standard** uncached text-token rates, in USD per 1,000,000 tokens, checked against the [pricing page](https://developers.openai.com/api/docs/pricing) on **2026-10-31**. Cached-input, batch, regional, and priority/fast rates are not applied.

| Model | API id | Encoding | Input / 1M | Output / 1M | Lifecycle |
| --- | --- | --- | --- | --- | --- |
| GPT-4o | `gpt-4o` | `o200k_base` | $2.50 | $10.00 | Deprecated, shutdown 2027-01-14 |
| GPT-4o mini | `gpt-4o-mini` | `o200k_base` | $0.15 | $0.60 | Deprecated, shutdown 2027-01-14 |
| GPT-4.1 | `gpt-4.1` | `o200k_base` | $2.00 | $8.00 | Deprecated, shutdown 2027-01-14 |
| GPT-4.1 mini | `gpt-4.1-mini` | `o200k_base` | $0.40 | $1.60 | Deprecated, shutdown 2027-01-14 |
| GPT-4.1 nano | `gpt-4.1-nano` | `o200k_base` | $0.10 | $0.40 | Shut down 2026-10-23 |

Lifecycle follows the [deprecations page](https://developers.openai.com/api/docs/deprecations). Shut-down models stay in the list so older prompts can still be estimated. The published price can change; the verified date is shown in the UI.

```
Input cost  = (input tokens  / 1,000,000) × input price per million
Output cost = (output tokens / 1,000,000) × output price per million
Total       = input cost + output cost
```

Context windows shown in the UI are the published text windows: 128,000 for GPT-4o and GPT-4o mini (max output 16,384), and 1,047,576 for the GPT-4.1 family (max output 32,768).

## Requirements

- Node.js 22.12+ or 24.15+ (Angular 22). This project was built with Node 24.
- npm 11

No database and no OpenAI key.

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
  "encoding": "o200k_base",
  "wordCount": 5,
  "characterCount": 41,
  "tokenCount": 5,
  "estimate": true
}
```

`tokenCount` is the `o200k_base` count for that string. Word and character counts are exact for the text; the token count is still an estimate of billed usage.

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

1. Add a tokenizer class that implements `TokenizerProvider` in `backend/src/tokenizers/`.
2. Register it in `createApp` (`backend/src/app.ts`).
3. Append a model in `backend/src/config/models.ts` with `provider`, `encoding`, and prices.

The dashboard reads `GET /api/models`, so a new OpenAI model that still uses `o200k_base` only needs a catalog entry. Prompt history, comparison, CSV export, and live API usage are not in this version; the split between catalog, tokenizer, and analysis service is where those features would attach.
