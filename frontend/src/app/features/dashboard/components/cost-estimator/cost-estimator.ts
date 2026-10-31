import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { formatCount, formatPricePerMillion, formatUsd } from '../../../../core/format';
import type { AnalyzeResponse, ModelDefinition } from '../../../../core/models/analyzer.models';
import { StatCard } from '../stat-card/stat-card';

@Component({
  selector: 'app-cost-estimator',
  imports: [StatCard],
  templateUrl: './cost-estimator.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostEstimator {
  readonly analysis = input<AnalyzeResponse | null>(null);
  readonly model = input<ModelDefinition | null>(null);
  readonly verifiedOn = input<string | null>(null);
  readonly pricingNote = input('');
  readonly source = input('');
  readonly maxOutputTokens = input(2_000_000);
  readonly loading = input(false);
  readonly outputTokensChange = output<number>();

  protected readonly invalidMessage = signal<string | null>(null);
  protected readonly formatUsd = formatUsd;
  protected readonly formatPricePerMillion = formatPricePerMillion;
  protected readonly formatCount = formatCount;

  protected priceHint(side: 'input' | 'output'): string {
    const inputPrice =
      this.analysis()?.pricing.inputPricePerMillionUsd ?? this.model()?.inputPricePerMillionUsd;
    const outputPrice =
      this.analysis()?.pricing.outputPricePerMillionUsd ?? this.model()?.outputPricePerMillionUsd;
    const price = side === 'input' ? inputPrice : outputPrice;
    if (price === null) {
      return 'No first-party price';
    }
    if (price === undefined) {
      return side === 'input' ? 'Uncached input tokens' : 'Output tokens';
    }

    return `${formatPricePerMillion(price)} / 1M${side === 'input' ? ' uncached' : ''}`;
  }

  protected cachedPrice(): string | null {
    const cached =
      this.analysis()?.pricing.cachedInputPricePerMillionUsd ??
      this.model()?.cachedInputPricePerMillionUsd ??
      null;
    return cached === null ? null : formatPricePerMillion(cached);
  }

  protected onOutputInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const raw = target.value;
    if (raw.trim() === '') {
      this.invalidMessage.set('Enter an expected output token count.');
      return;
    }

    const parsed = Number(raw);
    const max = this.maxOutputTokens();
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
      this.invalidMessage.set(`Enter a whole number from 0 to ${formatCount(max)}.`);
      return;
    }

    this.invalidMessage.set(null);
    this.outputTokensChange.emit(parsed);
  }
}
