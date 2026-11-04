import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  router.navigate(['/ch15-auth-guards']);   // bounce back to login
  return false;
};

export const roleGuard = (requiredRole: 'admin' | 'user'): CanActivateFn => {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      router.navigate(['/ch15-auth-guards']);
      return false;
    }
    if (!auth.hasRole(requiredRole)) {
      router.navigate(['/ch15-auth-guards']);
      return false;
    }
    return true;
  };
};
