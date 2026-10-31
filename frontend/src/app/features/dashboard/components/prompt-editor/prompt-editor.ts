import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { formatCount } from '../../../../core/format';

@Component({
  selector: 'app-prompt-editor',
  imports: [MatButtonModule],
  templateUrl: './prompt-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptEditor {
  private readonly destroyRef = inject(DestroyRef);
  private readonly area = viewChild<ElementRef<HTMLTextAreaElement>>('area');
  private copyTimer: ReturnType<typeof setTimeout> | undefined;

  readonly maxLength = input(400_000);
  readonly wordCount = input(0);
  readonly characterCount = input(0);
  readonly tokenCount = input<number | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly textChange = output<string>();

  protected readonly copied = signal(false);
  protected readonly copyError = signal<string | null>(null);
  protected readonly formatCount = formatCount;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer !== undefined) {
        clearTimeout(this.copyTimer);
      }
    });
  }

  protected onInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    this.copyError.set(null);
    this.textChange.emit(target.value);
  }

  protected clear(): void {
    const element = this.area()?.nativeElement;
    if (element) {
      element.value = '';
    }
    this.copyError.set(null);
    this.copied.set(false);
    this.textChange.emit('');
  }

  protected copy(): void {
    const element = this.area()?.nativeElement;
    if (!element) {
      return;
    }

    if (this.copyWithCommand(element)) {
      this.markCopied();
      return;
    }

    const value = element.value;
    if (!navigator.clipboard?.writeText) {
      this.copied.set(false);
      this.copyError.set('Copy failed. Select the prompt and copy it manually.');
      return;
    }

    void navigator.clipboard.writeText(value).then(
      () => this.markCopied(),
      () => {
        this.copied.set(false);
        this.copyError.set('Copy failed. Select the prompt and copy it manually.');
      },
    );
  }

  private copyWithCommand(element: HTMLTextAreaElement): boolean {
    element.focus();
    element.select();
    return document.execCommand('copy');
  }

  private markCopied(): void {
    this.copyError.set(null);
    this.copied.set(true);
    if (this.copyTimer !== undefined) {
      clearTimeout(this.copyTimer);
    }
    this.copyTimer = setTimeout(() => this.copied.set(false), 2000);
    const element = this.area()?.nativeElement;
    if (element) {
      const end = element.value.length;
      element.setSelectionRange(end, end);
    }
  }
}
