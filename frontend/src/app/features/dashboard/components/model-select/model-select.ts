import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { formatCount, formatPricePerMillion } from '../../../../core/format';
import type { ModelDefinition, ProviderStatus } from '../../../../core/models/analyzer.models';

@Component({
  selector: 'app-model-select',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './model-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSelect {
  readonly providers = input.required<ProviderStatus[]>();
  readonly providerId = input.required<string>();
  readonly models = input.required<ModelDefinition[]>();
  readonly modelId = input.required<string>();
  readonly disabled = input(false);
  readonly providerIdChange = output<string>();
  readonly modelIdChange = output<string>();

  protected readonly formatPricePerMillion = formatPricePerMillion;
  protected readonly formatCount = formatCount;

  protected readonly selectedProvider = computed(
    () => this.providers().find((provider) => provider.id === this.providerId()) ?? null,
  );

  protected readonly selected = computed(
    () => this.models().find((model) => model.id === this.modelId()) ?? null,
  );

  protected chooseProvider(providerId: unknown): void {
    if (typeof providerId === 'string' && providerId !== this.providerId()) {
      this.providerIdChange.emit(providerId);
    }
  }

  protected choose(modelId: unknown): void {
    if (typeof modelId === 'string' && modelId !== this.modelId()) {
      this.modelIdChange.emit(modelId);
    }
  }

  protected statusLabel(model: ModelDefinition): string {
    return model.lifecycle === 'shutdown' ? 'Shut down' : 'Deprecated';
  }
}
