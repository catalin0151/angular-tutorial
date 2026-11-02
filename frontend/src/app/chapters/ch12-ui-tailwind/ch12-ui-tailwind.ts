import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch12-ui-tailwind',
  imports: [ComingSoon],
  template: `<app-coming-soon num="12" title="UI with Tailwind" />`,
})
export class Ch12UiTailwind {}
