import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  readonly emphasis = input(false);
}
