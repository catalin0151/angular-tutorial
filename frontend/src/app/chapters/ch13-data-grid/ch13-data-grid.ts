import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch13-data-grid',
  imports: [ComingSoon],
  template: `<app-coming-soon num="13" title="Data grid" />`,
})
export class Ch13DataGrid {}
