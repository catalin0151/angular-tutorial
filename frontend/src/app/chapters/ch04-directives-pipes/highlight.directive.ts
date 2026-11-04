import { Directive, effect, ElementRef, HostListener, input, inject } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
})
export class Highlight {
  readonly appHighlight = input<string>('#fef08a');
  readonly always = input<boolean>(false);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);


  @HostListener('mouseenter') onEnter() {
    if (this.always()) {
      return;
    }
    this.setColor(this.appHighlight() || '#fef08a');
  }
  @HostListener('mouseleave') onLeave() {
    if (this.always()) {
      return
    }
    this.setColor('');
  }
  constructor() {
    effect(() => {
      if (this.always()) {
        this.setColor(this.appHighlight() || '#fef08a')
      }
    })

  }
  private setColor(color: string) {
    this.el.nativeElement.style.backgroundColor = color;
  }
}
