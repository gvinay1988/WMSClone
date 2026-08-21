import {
  ApplicationConfig,provideBrowserGlobalErrorListeners,provideZonelessChangeDetection} from '@angular/core';
import {provideHttpClient,withFetch,withInterceptors} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {provideClientHydration,withEventReplay} from '@angular/platform-browser';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideToastr } from 'ngx-toastr';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    provideAnimationsAsync(),
    provideClientHydration(
      withEventReplay()
    ),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-center',
      preventDuplicates: true
    })

  ]

};