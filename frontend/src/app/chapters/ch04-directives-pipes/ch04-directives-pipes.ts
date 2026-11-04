import { Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe, SlicePipe, TitleCasePipe } from '@angular/common';
import { Highlight } from './highlight.directive';
import { TruncatePipe } from './truncate.pipe';
import { YesNoPipe } from './yes-no.pipe';
import { ClickOutside } from './click-outside.directive';
@Component({
  selector: 'app-ch04-directives-pipes',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, PercentPipe, SlicePipe, TitleCasePipe, Highlight, TruncatePipe, YesNoPipe, ClickOutside],
  templateUrl: './ch04-directives-pipes.html',
  styleUrl: './ch04-directives-pipes.css',
})
export class Ch04DirectivesPipes {
  readonly now = new Date();
  readonly price = 1234.567;
  readonly rate = 0.0825;
  readonly score = signal(50);
  readonly longText = signal(
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.'
  );
  readonly isActive = signal(true);
  readonly fontSize = signal(16);
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput')
  readonly scoreClass = computed(() => {
    if (this.score() < 20) {
      return 'low'
    } else if (this.score() < 50) {
      return 'mid'
    } else {
      return 'high'
    }
  })
  toggle() { this.isActive.update(x => !x); }
  bump() { this.fontSize.update(n => Math.min(n + 2, 32)); }
  shrink() { this.fontSize.update(n => Math.max(n - 2, 10)); }
  onClickOutside() {
    console.log('on click outside');
  }
  onFocusSearch() {
    this.searchInput()?.nativeElement.focus();
  }
}
