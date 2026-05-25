import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  const token = authService.getToken();
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/access-token')) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

const shouldSkipAuth = (url: string): boolean => {
  return (
    url.includes('/auth/access-token') ||
    url.includes('/auth/refresh-token') ||
    url.includes('/auth/exchange-keycloak-token') ||
    url.includes('/auth/exchange-google-token') ||
    url.includes('/auth/exchange-github-token') ||
    url.includes('/auth/captcha') ||
    url.includes('/realms/')
  );
};

const handle401Error = (request: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        const nextToken = response?.accessToken as string | undefined;
        if (!nextToken) {
          authService.logout();
          return throwError(() => new Error('Refresh token response missing accessToken'));
        }

        isRefreshing = false;
        refreshTokenSubject.next(nextToken);
        return next(addToken(request, nextToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  return refreshTokenSubject.pipe(
    filter((token) => token != null),
    take(1),
    switchMap((token) => next(addToken(request, token!)))
  );
};

const addToken = (request: HttpRequest<unknown>, token: string): HttpRequest<unknown> => {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};
