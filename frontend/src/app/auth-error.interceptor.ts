import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const SESSION_ENDPOINT_PREFIX = '/api/auth/';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      // The session endpoints answer 401 as their normal negative answer — an
      // anonymous page load calls /auth/me and expects to be told no. Only a
      // 401 from a business endpoint means a session went dead mid-use.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.startsWith(SESSION_ENDPOINT_PREFIX)
      ) {
        auth.clearSession();
        void router.navigateByUrl('/');
      }
      // Rethrown, not swallowed: callers still have loading state to unwind.
      return throwError(() => error);
    }),
  );
};
