import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch08-forms-reactive',
  imports: [ComingSoon],
  template: `<app-coming-soon num="08" title="Reactive forms" />`,
})
export class Ch08FormsReactive {}
