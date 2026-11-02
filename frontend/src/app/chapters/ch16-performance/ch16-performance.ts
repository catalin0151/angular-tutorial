import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch16-performance',
  imports: [ComingSoon],
  template: `<app-coming-soon num="16" title="Performance" />`,
})
export class Ch16Performance {}
