import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './auth.guard';

export const ch15Routes: Routes = [
  {
    path: 'public',
    canActivate: [authGuard],
    loadComponent: () => import('./public/public').then(m => m.Public),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
  },
];
