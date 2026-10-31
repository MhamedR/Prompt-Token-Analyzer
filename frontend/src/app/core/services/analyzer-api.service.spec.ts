import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AnalyzeRequest } from '../models/analyzer.models';
import { AnalyzerApiService } from './analyzer-api.service';

describe('AnalyzerApiService', () => {
  let service: AnalyzerApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyzerApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the model catalog', () => {
    service.getModels().subscribe((response) => {
      expect(response.models[0]?.id).toBe('gpt-4o');
    });

    const request = http.expectOne('http://localhost:3000/api/models');
    expect(request.request.method).toBe('GET');
    request.flush({ models: [{ id: 'gpt-4o' }] });
  });

  it('posts text to the count endpoint', () => {
    service.countTokens('gpt-4o', 'hello').subscribe();

    const request = http.expectOne('http://localhost:3000/api/tokens/count');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ model: 'gpt-4o', text: 'hello' });
    request.flush({ tokenCount: 1 });
  });

  it('posts the section analysis', () => {
    const body: AnalyzeRequest = {
      model: 'gpt-4o',
      systemPrompt: 'You are a helpful assistant',
      userPrompt: 'Explain AI',
      context: 'Additional information',
      expectedOutputTokens: 500,
    };

    service.analyze(body).subscribe();

    const request = http.expectOne('http://localhost:3000/api/tokens/analyze');
    expect(request.request.body).toEqual(body);
    request.flush({ totalEstimatedCostUsd: 0 });
  });
});
