import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../../chapters/ch15-auth-guards/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const token = auth.token();

  // Attach the token for non-login API calls.
  // Note: req.url has already been rewritten by apiBaseUrlInterceptor to include the host,
  // so we match on `/api/` appearing anywhere, and exclude the login endpoint explicitly.
  const isApi = req.url.includes('/api/');
  const isLogin = req.url.endsWith('/api/auth/login');
  const shouldAttach = !!token && isApi && !isLogin;
  const outgoing = shouldAttach
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      // Global 401 handling: token invalid/expired → log out
      if (err.status === 401 && shouldAttach) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
