import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);

  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('jwt_token')
      : null;

  console.log('Access Token:', token);

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {

      if (error.status === 400 || error.status === 401) {

        if (typeof window !== 'undefined') {

          sessionStorage.removeItem('jwt_token');
          sessionStorage.removeItem('auth_user');

          router.navigate(['/server-error']);
        }
      }

      return throwError(() => error);
    })

  );
};