import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch09-http-backend',
  imports: [ComingSoon],
  template: `<app-coming-soon num="09" title="HttpClient & backend" />`,
})
export class Ch09HttpBackend {}
