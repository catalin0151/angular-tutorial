import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch15-auth-guards',
  imports: [ComingSoon],
  template: `<app-coming-soon num="15" title="Auth, guards, interceptors" />`,
})
export class Ch15AuthGuards {}
