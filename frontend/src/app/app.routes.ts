import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ch01-hello' },

  {
    path: 'ch01-hello',
    loadComponent: () => import('./chapters/ch01-hello/ch01-hello').then(m => m.Ch01Hello),
  },
  {
    path: 'ch02-components',
    loadComponent: () => import('./chapters/ch02-components/ch02-components').then(m => m.Ch02Components),
  },
  {
    path: 'ch03-binding-signals',
    loadComponent: () => import('./chapters/ch03-binding-signals/ch03-binding-signals').then(m => m.Ch03BindingSignals),
  },
  {
    path: 'ch04-directives-pipes',
    loadComponent: () => import('./chapters/ch04-directives-pipes/ch04-directives-pipes').then(m => m.Ch04DirectivesPipes),
  },
  {
    path: 'ch05-services-di',
    loadComponent: () => import('./chapters/ch05-services-di/ch05-services-di').then(m => m.Ch05ServicesDi),
  },
  {
    path: 'ch06-routing',
    loadComponent: () => import('./chapters/ch06-routing/ch06-routing').then(m => m.Ch06Routing),
  },
  {
    path: 'ch07-forms-template',
    loadComponent: () => import('./chapters/ch07-forms-template/ch07-forms-template').then(m => m.Ch07FormsTemplate),
  },
  {
    path: 'ch08-forms-reactive',
    loadComponent: () => import('./chapters/ch08-forms-reactive/ch08-forms-reactive').then(m => m.Ch08FormsReactive),
  },
  {
    path: 'ch09-http-backend',
    loadComponent: () => import('./chapters/ch09-http-backend/ch09-http-backend').then(m => m.Ch09HttpBackend),
  },
  {
    path: 'ch10-rxjs-basics',
    loadComponent: () => import('./chapters/ch10-rxjs-basics/ch10-rxjs-basics').then(m => m.Ch10RxjsBasics),
  },
  {
    path: 'ch11-state-signals',
    loadComponent: () => import('./chapters/ch11-state-signals/ch11-state-signals').then(m => m.Ch11StateSignals),
  },
  {
    path: 'ch12-ui-tailwind',
    loadComponent: () => import('./chapters/ch12-ui-tailwind/ch12-ui-tailwind').then(m => m.Ch12UiTailwind),
  },
  {
    path: 'ch13-data-grid',
    loadComponent: () => import('./chapters/ch13-data-grid/ch13-data-grid').then(m => m.Ch13DataGrid),
  },
  {
    path: 'ch14-dynamic-reports',
    loadComponent: () => import('./chapters/ch14-dynamic-reports/ch14-dynamic-reports').then(m => m.Ch14DynamicReports),
  },
  {
    path: 'ch15-auth-guards',
    loadComponent: () => import('./chapters/ch15-auth-guards/ch15-auth-guards').then(m => m.Ch15AuthGuards),
  },
  {
    path: 'ch16-performance',
    loadComponent: () => import('./chapters/ch16-performance/ch16-performance').then(m => m.Ch16Performance),
  },
  {
    path: 'ch17-testing-intro',
    loadComponent: () => import('./chapters/ch17-testing-intro/ch17-testing-intro').then(m => m.Ch17TestingIntro),
  },

  { path: '**', redirectTo: 'ch01-hello' },
];
