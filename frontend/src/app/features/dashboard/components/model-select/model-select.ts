import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { formatCount, formatPricePerMillion } from '../../../../core/format';
import type { ModelDefinition } from '../../../../core/models/analyzer.models';

@Component({
  selector: 'app-model-select',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './model-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSelect {
  readonly models = input.required<ModelDefinition[]>();
  readonly modelId = input.required<string>();
  readonly disabled = input(false);
  readonly modelIdChange = output<string>();

  protected readonly formatPricePerMillion = formatPricePerMillion;
  protected readonly formatCount = formatCount;

  protected readonly selected = computed(
    () => this.models().find((model) => model.id === this.modelId()) ?? null,
  );

  protected choose(modelId: unknown): void {
    if (typeof modelId === 'string' && modelId !== this.modelId()) {
      this.modelIdChange.emit(modelId);
    }
  }

  protected statusLabel(model: ModelDefinition): string {
    return model.lifecycle === 'shutdown' ? 'Shut down' : 'Deprecated';
  }
}
