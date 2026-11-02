import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch03-binding-signals',
  imports: [ComingSoon],
  template: `<app-coming-soon num="03" title="Binding & signals" />`,
})
export class Ch03BindingSignals {}
