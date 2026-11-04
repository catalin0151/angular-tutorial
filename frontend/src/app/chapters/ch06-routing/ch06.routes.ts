import { CanActivateFn, CanDeactivateFn, Routes } from '@angular/router';
import { AccountDetail } from './account-detail/account-detail';

export const confirmLeaveGuard: CanDeactivateFn<AccountDetail> = (component: AccountDetail) => {
  return !component.isDirty() || confirm('Leave with unsaved changes?');
};
export const authGuard: CanActivateFn = () => {
  console.log('auth guard check');
  return true;
};
export const ch06Routes: Routes = [
  { path: '', loadComponent: () => import('./overview/overview').then(m => m.Overview) },
  { path: 'accounts', loadComponent: () => import('./accounts/accounts').then(m => m.Accounts) },
  {
    path: 'accounts/:id',
    loadComponent: () => import('./account-detail/account-detail').then(m => m.AccountDetail),
    canDeactivate: [confirmLeaveGuard],
    canActivate: [authGuard]
  },
];
