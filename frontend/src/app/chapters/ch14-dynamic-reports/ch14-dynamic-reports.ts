import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch14-dynamic-reports',
  imports: [ComingSoon],
  template: `<app-coming-soon num="14" title="Dynamic reports" />`,
})
export class Ch14DynamicReports {}
