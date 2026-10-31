import { Router } from 'express';
import { parseAnalyzeBody, parseCountBody } from '../http/validation.js';
import type { AnalysisService } from '../services/analysis-service.js';

export function createTokensRouter(analysis: AnalysisService): Router {
  const router = Router();

  router.post('/count', (request, response, next) => {
    try {
      response.json(analysis.count(parseCountBody(request.body)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/analyze', (request, response, next) => {
    try {
      response.json(analysis.analyze(parseAnalyzeBody(request.body)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
