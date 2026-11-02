import { Component } from '@angular/core';
import { ComingSoon } from '../../shared/coming-soon/coming-soon';

@Component({
  selector: 'app-ch04-directives-pipes',
  imports: [ComingSoon],
  template: `<app-coming-soon num="04" title="Directives & pipes" />`,
})
export class Ch04DirectivesPipes {}
