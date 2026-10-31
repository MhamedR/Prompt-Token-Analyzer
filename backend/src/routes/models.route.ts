import { Router } from 'express';
import type { AnalysisService } from '../services/analysis-service.js';

export function createModelsRouter(analysis: AnalysisService): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json(analysis.listModels());
  });

  return router;
}
