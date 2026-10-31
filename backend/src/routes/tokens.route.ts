import { Router } from 'express';
import { parseAnalyzeBody, parseCountBody } from '../http/validation.js';
import type { AnalysisService } from '../services/analysis-service.js';

export function createTokensRouter(analysis: AnalysisService): Router {
  const router = Router();

  router.post('/count', async (request, response, next) => {
    try {
      response.json(await analysis.count(parseCountBody(request.body)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/analyze', async (request, response, next) => {
    try {
      response.json(await analysis.analyze(parseAnalyzeBody(request.body)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
