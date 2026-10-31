import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';

describe('HTTP API', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('lists models and their published prices', async () => {
    const response = await request(app).get('/api/models').expect(200);

    const ids = response.body.models.map((model: { id: string }) => model.id);
    expect(ids).toEqual(expect.arrayContaining([
      'gpt-4o',
      'claude-sonnet-5-5',
      'gemini-3.8-flash',
      'llama-3.3-70b',
      'mistral-small-2603',
      'deepseek-v4-pro',
    ]));
    expect(response.body.providers.map((provider: { id: string }) => provider.id)).toEqual([
      'openai',
      'anthropic',
      'google',
      'meta',
      'mistral',
      'deepseek',
    ]);
    expect(response.body.models[0]).toMatchObject({
      id: 'gpt-4o',
      tokenizerKey: 'o200k_base',
      inputPricePerMillionUsd: 2.5,
      outputPricePerMillionUsd: 10,
    });
    expect(response.body.pricing.note).toContain('price source');
  });

  it('counts tokens for a prompt', async () => {
    const response = await request(app)
      .post('/api/tokens/count')
      .send({ model: 'gpt-4o', text: 'tiktoken is great!' })
      .expect(200);

    expect(response.body).toMatchObject({
      model: 'gpt-4o',
      provider: 'openai',
      wordCount: 3,
      characterCount: 18,
      tokenCount: 6,
      accuracy: 'exact',
      countingOnly: true,
      tokenizerMethod: 'js-tiktoken o200k_base',
    });
  });

  it('analyzes sections and returns a USD estimate', async () => {
    const response = await request(app)
      .post('/api/tokens/analyze')
      .send({
        model: 'gpt-4.1-mini',
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Explain AI',
        context: 'Additional information',
        expectedOutputTokens: 500,
      })
      .expect(200);

    expect(response.body.totalInputTokens).toBe(
      response.body.systemPromptTokens +
        response.body.userPromptTokens +
        response.body.contextTokens,
    );
    expect(response.body.expectedOutputTokens).toBe(500);
    expect(response.body.currency).toBe('USD');
    expect(response.body.pricing.inputPricePerMillionUsd).toBe(0.4);
    expect(response.body.pricing.outputPricePerMillionUsd).toBe(1.6);
    expect(response.body.totalEstimatedCostUsd).toBeGreaterThan(0);
  });

  it('returns a validation error for an unsupported model', async () => {
    const response = await request(app)
      .post('/api/tokens/count')
      .send({ model: 'not-a-model', text: 'Hello' })
      .expect(400);

    expect(response.body.error.code).toBe('UNSUPPORTED_MODEL');
  });

  it('returns a validation error for malformed analyze input', async () => {
    const response = await request(app)
      .post('/api/tokens/analyze')
      .send({ model: 'gpt-4o', userPrompt: 'Hello' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects invalid JSON', async () => {
    const response = await request(app)
      .post('/api/tokens/count')
      .set('Content-Type', 'application/json')
      .send('{"model":')
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 404 for an unknown route', async () => {
    await request(app).get('/api/missing').expect(404);
  });
});
