import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch10-rxjs-basics',
  imports: [ComingSoon],
  template: `<app-coming-soon num="10" title="RxJS basics" />`,
})
export class Ch10RxjsBasics {}
