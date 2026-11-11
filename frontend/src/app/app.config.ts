import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { apiBaseUrlInterceptor } from './shared/interceptors/api-base-url.interceptor';
import { authInterceptor } from './shared/interceptors/auth.interceptor';
import { relativeUrlBaseInterceptor } from './shared/interceptors/relative-path-url.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Order: rewrite /... → http://localhost:3000/... FIRST, then attach the auth token.
    provideHttpClient(withInterceptors([relativeUrlBaseInterceptor, authInterceptor])),
  ]
};
