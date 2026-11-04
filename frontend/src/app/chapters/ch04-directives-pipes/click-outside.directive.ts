import { Directive, ElementRef, HostListener, inject, output } from '@angular/core'

@Directive({ selector: '[appClickOutside]' })
export class ClickOutside {
    readonly appOnClickOutside = output<void>()

    private readonly el = inject<ElementRef<HTMLElement>>(ElementRef)

    @HostListener('document:click', ['$event.target'])
    onDocCLick(target: EventTarget | null) {
        if (target && !this.el.nativeElement.contains(target as Node)) {
            this.appOnClickOutside.emit();
        }
    }
}