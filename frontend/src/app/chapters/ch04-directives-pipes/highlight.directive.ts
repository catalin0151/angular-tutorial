import { Directive, ElementRef, HostListener, input, inject } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
})
export class Highlight {
  readonly appHighlight = input<string>('#fef08a');
  private readonly el = inject(ElementRef<HTMLElement>);

  @HostListener('mouseenter') onEnter() { this.set(this.appHighlight()); }
  @HostListener('mouseleave') onLeave() { this.set(''); }

  private set(color: string) {
    this.el.nativeElement.style.backgroundColor = color;
  }
}
