import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { ModelCatalog } from './config/model-catalog.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { createModelsRouter } from './routes/models.route.js';
import { createTokensRouter } from './routes/tokens.route.js';
import { AnalysisService } from './services/analysis-service.js';
import { createTokenizerRegistry } from './tokenizers/create-registry.js';

export async function createApp(): Promise<express.Express> {
  const analysis = new AnalysisService(new ModelCatalog(), createTokenizerRegistry(env));
  await analysis.warmTokenizers();

  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ['GET', 'POST'],
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.use('/api/models', createModelsRouter(analysis));
  app.use('/api/tokens', createTokensRouter(analysis));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
