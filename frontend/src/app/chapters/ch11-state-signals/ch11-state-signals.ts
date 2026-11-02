import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch11-state-signals',
  imports: [ComingSoon],
  template: `<app-coming-soon num="11" title="State with signals" />`,
})
export class Ch11StateSignals {}
