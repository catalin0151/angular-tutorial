import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch05-services-di',
  imports: [ComingSoon],
  template: `<app-coming-soon num="05" title="Services & DI" />`,
})
export class Ch05ServicesDi {}
