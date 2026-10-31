import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { ModelsResponse } from '../../core/models/analyzer.models';
import { AnalyzerApiService } from '../../core/services/analyzer-api.service';
import { Dashboard } from './dashboard';

const models: ModelsResponse = {
  models: [
    {
      id: 'gpt-4o',
      displayName: 'GPT-4o',
      provider: 'openai',
      encoding: 'o200k_base',
      inputPricePerMillionUsd: 2.5,
      outputPricePerMillionUsd: 10,
      cachedInputPricePerMillionUsd: 1.25,
      contextWindow: 128000,
      maxOutputTokens: 16384,
      lifecycle: 'deprecated',
      shutdownDate: '2027-01-14',
      lifecycleNote: 'Deprecated.',
    },
  ],
  pricing: {
    source: 'https://developers.openai.com/api/docs/pricing',
    verifiedOn: '2026-10-31',
    tier: 'OpenAI standard text tokens',
    note: 'Prices can change.',
  },
  limits: {
    maxCharactersPerField: 400000,
    maxExpectedOutputTokens: 2000000,
  },
  limitations: ['Token counts are estimates of plain text.'],
};

describe('Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        {
          provide: AnalyzerApiService,
          useValue: {
            getModels: () => of(models),
            countTokens: () => of({ tokenCount: 0 }),
            analyze: () => of({ totalInputTokens: 0, totalTokens: 500 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the application title', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const title = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(title?.textContent).toContain('Prompt Token Analyzer');
    fixture.destroy();
  });
});
