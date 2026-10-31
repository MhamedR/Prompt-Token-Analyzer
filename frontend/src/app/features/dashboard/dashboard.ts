import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EMPTY, combineLatest } from 'rxjs';
import { catchError, debounceTime, switchMap, tap } from 'rxjs/operators';
import { formatCount } from '../../core/format';
import { readHttpError } from '../../core/http-error';
import type {
  AnalyzeResponse,
  ModelDefinition,
  ModelsResponse,
  PricingCatalog,
  TokenCountResponse,
} from '../../core/models/analyzer.models';
import { AnalyzerApiService } from '../../core/services/analyzer-api.service';
import { countCharacters, countWords } from '../../core/text-metrics';
import { CostEstimator } from './components/cost-estimator/cost-estimator';
import { ModelSelect } from './components/model-select/model-select';
import { PromptEditor } from './components/prompt-editor/prompt-editor';
import { PromptSection } from './components/prompt-section/prompt-section';
import { StatCard } from './components/stat-card/stat-card';
import { TokenBreakdown } from './components/token-breakdown/token-breakdown';

const ESTIMATE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-dashboard',
  imports: [
    MatButtonModule,
    MatProgressBarModule,
    ModelSelect,
    PromptEditor,
    PromptSection,
    StatCard,
    CostEstimator,
    TokenBreakdown,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly api = inject(AnalyzerApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly models = signal<ModelDefinition[]>([]);
  readonly pricing = signal<PricingCatalog | null>(null);
  readonly limitations = signal<string[]>([]);
  readonly modelsLoading = signal(true);
  readonly modelsError = signal<string | null>(null);
  readonly maxCharacters = signal(400_000);
  readonly maxOutputTokens = signal(2_000_000);

  readonly selectedModelId = signal('gpt-4o');
  readonly userPrompt = signal('');
  readonly systemPrompt = signal('');
  readonly context = signal('');
  readonly expectedOutputTokens = signal(500);

  readonly editorCount = signal<TokenCountResponse | null>(null);
  readonly editorLoading = signal(false);
  readonly editorError = signal<string | null>(null);

  readonly analysis = signal<AnalyzeResponse | null>(null);
  readonly analysisLoading = signal(false);
  readonly analysisError = signal<string | null>(null);

  readonly selectedModel = computed(
    () => this.models().find((model) => model.id === this.selectedModelId()) ?? null,
  );
  readonly editorWords = computed(() => countWords(this.userPrompt()));
  readonly editorCharacters = computed(() => countCharacters(this.userPrompt()));
  readonly busy = computed(
    () => this.modelsLoading() || this.editorLoading() || this.analysisLoading(),
  );

  protected readonly formatCount = formatCount;

  private readonly editorEstimates = combineLatest([
    toObservable(this.selectedModelId),
    toObservable(this.userPrompt),
  ]).pipe(
    debounceTime(ESTIMATE_DEBOUNCE_MS),
    tap(() => {
      this.editorLoading.set(true);
      this.editorError.set(null);
    }),
    switchMap(([model, text]) => {
      const tooLong = this.lengthError(text, 'This prompt');
      if (tooLong) {
        this.editorLoading.set(false);
        this.editorError.set(tooLong);
        return EMPTY;
      }

      return this.api.countTokens(model, text).pipe(
        catchError((error: unknown) => {
          this.editorLoading.set(false);
          this.editorError.set(readHttpError(error, 'Could not count tokens.'));
          return EMPTY;
        }),
      );
    }),
  );

  private readonly requestEstimates = combineLatest([
    toObservable(this.selectedModelId),
    toObservable(this.userPrompt),
    toObservable(this.systemPrompt),
    toObservable(this.context),
    toObservable(this.expectedOutputTokens),
  ]).pipe(
    debounceTime(ESTIMATE_DEBOUNCE_MS),
    tap(() => {
      this.analysisLoading.set(true);
      this.analysisError.set(null);
    }),
    switchMap(([model, userPrompt, systemPrompt, context, expectedOutputTokens]) => {
      const tooLong =
        this.lengthError(systemPrompt, 'System instructions') ??
        this.lengthError(userPrompt, 'User prompt') ??
        this.lengthError(context, 'Additional context');
      if (tooLong) {
        this.analysisLoading.set(false);
        this.analysisError.set(tooLong);
        return EMPTY;
      }

      return this.api
        .analyze({ model, systemPrompt, userPrompt, context, expectedOutputTokens })
        .pipe(
          catchError((error: unknown) => {
            this.analysisLoading.set(false);
            this.analysisError.set(readHttpError(error, 'Could not analyze the prompt.'));
            return EMPTY;
          }),
        );
    }),
  );

  constructor() {
    this.loadModels();
    this.editorEstimates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      this.editorCount.set(result);
      this.editorLoading.set(false);
    });
    this.requestEstimates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      this.analysis.set(result);
      this.analysisLoading.set(false);
    });
  }

  protected loadModels(): void {
    this.modelsLoading.set(true);
    this.modelsError.set(null);
    this.api
      .getModels()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.applyModels(response),
        error: (error: unknown) => {
          this.modelsLoading.set(false);
          this.modelsError.set(
            error instanceof HttpErrorResponse
              ? readHttpError(error, 'Could not load models.')
              : 'Could not load models.',
          );
        },
      });
  }

  protected selectModel(modelId: string): void {
    this.selectedModelId.set(modelId);
  }

  private applyModels(response: ModelsResponse): void {
    this.models.set(response.models);
    this.pricing.set(response.pricing);
    this.limitations.set(response.limitations);
    this.maxCharacters.set(response.limits.maxCharactersPerField);
    this.maxOutputTokens.set(response.limits.maxExpectedOutputTokens);
    if (
      response.models.length > 0 &&
      !response.models.some((model) => model.id === this.selectedModelId())
    ) {
      this.selectedModelId.set(response.models[0].id);
    }
    this.modelsLoading.set(false);
  }

  private lengthError(text: string, label: string): string | null {
    if (text.length <= this.maxCharacters()) {
      return null;
    }

    return `${label} is too long. The limit is ${formatCount(this.maxCharacters())} characters.`;
  }
}
