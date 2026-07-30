import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { authErrorInterceptor } from './auth-error.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authErrorInterceptor])),
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => config.src,
    },
  ],
};
