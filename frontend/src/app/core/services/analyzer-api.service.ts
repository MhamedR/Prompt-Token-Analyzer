import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ModelsResponse,
  TokenCountResponse,
} from '../models/analyzer.models';

@Injectable({ providedIn: 'root' })
export class AnalyzerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getModels(): Observable<ModelsResponse> {
    return this.http.get<ModelsResponse>(`${this.baseUrl}/models`);
  }

  countTokens(model: string, text: string): Observable<TokenCountResponse> {
    return this.http.post<TokenCountResponse>(`${this.baseUrl}/tokens/count`, { model, text });
  }

  analyze(request: AnalyzeRequest): Observable<AnalyzeResponse> {
    return this.http.post<AnalyzeResponse>(`${this.baseUrl}/tokens/analyze`, request);
  }
}
