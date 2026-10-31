import { AppError } from '../errors/app-error.js';
import { MODELS, type ModelDefinition } from './models.js';

export class ModelCatalog {
  constructor(private readonly models: readonly ModelDefinition[] = MODELS) {
    const ids = new Set<string>();
    for (const model of models) {
      if (ids.has(model.id)) {
        throw new Error(`Duplicate model id "${model.id}".`);
      }
      ids.add(model.id);
    }
  }

  list(): readonly ModelDefinition[] {
    return this.models;
  }

  require(modelId: string): ModelDefinition {
    const model = this.models.find((item) => item.id === modelId);
    if (!model) {
      throw new AppError('UNSUPPORTED_MODEL', `Model "${modelId}" is not supported.`, 400, [
        {
          field: 'model',
          message: `Supported models: ${this.models.map((item) => item.id).join(', ')}.`,
        },
      ]);
    }

    return model;
  }
}
