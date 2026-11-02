import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch02-components',
  imports: [ComingSoon],
  template: `<app-coming-soon num="02" title="Components & templates" />`,
})
export class Ch02Components {}
