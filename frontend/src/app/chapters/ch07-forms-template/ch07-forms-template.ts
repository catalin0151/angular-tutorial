import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch07-forms-template',
  imports: [ComingSoon],
  template: `<app-coming-soon num="07" title="Template-driven forms" />`,
})
export class Ch07FormsTemplate {}
