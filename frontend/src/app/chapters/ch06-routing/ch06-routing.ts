import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch06-routing',
  imports: [ComingSoon],
  template: `<app-coming-soon num="06" title="Routing" />`,
})
export class Ch06Routing {}
