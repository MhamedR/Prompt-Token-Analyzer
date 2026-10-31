import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatCount } from '../../../../core/format';

@Component({
  selector: 'app-prompt-section',
  templateUrl: './prompt-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptSection {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly placeholder = input('');
  readonly rows = input(5);
  readonly maxLength = input(400_000);
  readonly tokenCount = input<number | null>(null);
  readonly textChange = output<string>();

  protected readonly formatCount = formatCount;

  protected onInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) {
      this.textChange.emit(target.value);
    }
  }
}
