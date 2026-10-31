import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatCount } from '../../../../core/format';
import type { AnalyzeResponse } from '../../../../core/models/analyzer.models';

@Component({
  selector: 'app-token-breakdown',
  templateUrl: './token-breakdown.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenBreakdown {
  readonly analysis = input<AnalyzeResponse | null>(null);
  protected readonly formatCount = formatCount;
}
