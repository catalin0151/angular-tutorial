import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ChapterLink {
  num: string;
  path: string;
  title: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly chapters: ChapterLink[] = [
    { num: '01', path: '/ch01-hello', title: 'Hello Angular' },
    { num: '01*', path: '/ch01-hello-clean', title: 'Hello Angular (clean)' },
    { num: '02', path: '/ch02-components', title: 'Components & templates' },
    { num: '02*', path: '/ch02-components-clean', title: 'Components (clean)' },
    { num: '03', path: '/ch03-binding-signals', title: 'Binding & signals' },
    { num: '04', path: '/ch04-directives-pipes', title: 'Directives & pipes' },
    { num: '05', path: '/ch05-services-di', title: 'Services & DI' },
    { num: '06', path: '/ch06-routing', title: 'Routing' },
    { num: '07', path: '/ch07-forms-template', title: 'Template-driven forms' },
    { num: '08', path: '/ch08-forms-reactive', title: 'Reactive forms' },
    { num: '09', path: '/ch09-http-backend', title: 'HttpClient & backend' },
    { num: '09', path: '/ch09-http-backend-catalin', title: 'HttpClient & backend Catalin' },
    { num: '10', path: '/ch10-rxjs-basics', title: 'RxJS basics' },
    { num: '10', path: '/ch10-http-backend-rxjs-catalin', title: 'HttpClient & backend RXJS Catalin' },
    { num: '11', path: '/ch11-state-signals', title: 'State with signals' },
    { num: '12', path: '/ch12-ui-tailwind', title: 'UI with Tailwind' },
    { num: '13', path: '/ch13-data-grid', title: 'Data grid' },
    { num: '14', path: '/ch14-dynamic-reports', title: 'Dynamic reports' },
    { num: '15', path: '/ch15-auth-guards', title: 'Auth, guards, interceptors' },
    { num: '16', path: '/ch16-performance', title: 'Performance' },
    { num: '17', path: '/ch17-testing-intro', title: 'Testing intro' },
  ];
}
