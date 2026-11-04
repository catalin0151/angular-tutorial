import { HttpInterceptorFn } from '@angular/common/http';

// Change this once to swap backends (staging, prod).
// In a real app this would come from `environment.ts`.
const API_BASE = 'http://localhost:3000';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    return next(req.clone({ url: API_BASE + req.url }));
  }
  return next(req);
};
