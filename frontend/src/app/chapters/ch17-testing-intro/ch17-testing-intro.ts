import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch17-testing-intro',
  imports: [ComingSoon],
  template: `<app-coming-soon num="17" title="Testing intro" />`,
})
export class Ch17TestingIntro {}
