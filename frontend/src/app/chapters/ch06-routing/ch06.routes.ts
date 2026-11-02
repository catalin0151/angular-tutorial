import { Routes } from '@angular/router';

export const ch06Routes: Routes = [
  { path: '', loadComponent: () => import('./overview/overview').then(m => m.Overview) },
  { path: 'accounts', loadComponent: () => import('./accounts/accounts').then(m => m.Accounts) },
  { path: 'accounts/:id', loadComponent: () => import('./account-detail/account-detail').then(m => m.AccountDetail) },
];
