// src/app/auth/interceptors/refresh-token.interceptor.ts
import { 
  HttpInterceptorFn, 
  HttpErrorResponse, 
  HttpEvent, 
  HttpRequest, 
  HttpHandlerFn 
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  catchError, 
  switchMap, 
  throwError, 
  BehaviorSubject, 
  filter, 
  take, 
  EMPTY, 
  Observable 
} from 'rxjs';
import { AuthService } from '../services/auth.service';

// State global pour gérer les requêtes concurrentes
let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const refreshTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔍 [REFRESH INTERCEPTOR] Processing request:', req.url);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('🔍 [REFRESH INTERCEPTOR] Error caught:', {
        status: error.status,
        url: req.url
      });

      // Gérer uniquement les erreurs 401 sur les endpoints non-auth
      if (error.status === 401 && !isAuthEndpoint(req.url)) {
        console.log('🚨 [REFRESH INTERCEPTOR] 401 detected, attempting refresh...');
        return handle401Error(req, next, authService, router);
      }

      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn, 
  authService: AuthService, 
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    console.log('🔧 [REFRESH INTERCEPTOR] Starting refresh process...');
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.warn('⚠️ [REFRESH INTERCEPTOR] No refresh token found');
      handleLogout(authService, router);
      return EMPTY;
    }

    console.log('🔍 [REFRESH INTERCEPTOR] Calling authService.refreshToken()...');
    
    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        console.log('✅ [REFRESH INTERCEPTOR] Token refreshed successfully');
        isRefreshing = false;
        
        const newToken = response.accessToken || authService.getToken();
        refreshTokenSubject.next(newToken);

        // Retry la requête originale avec le nouveau token
        const newReq = addTokenToRequest(req, newToken);
        console.log('🔄 [REFRESH INTERCEPTOR] Retrying original request');
        return next(newReq);
      }),
      catchError((err) => {
        console.error('❌ [REFRESH INTERCEPTOR] Refresh failed:', err);
        isRefreshing = false;
        refreshTokenSubject.next(null);
        handleLogout(authService, router);
        return throwError(() => err);
      })
    );
  } else {
    // Si un refresh est en cours, attendre qu'il se termine
    console.log('⏳ [REFRESH INTERCEPTOR] Refresh in progress, waiting...');
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        console.log('🔄 [REFRESH INTERCEPTOR] Using refreshed token for queued request');
        if (token) {
          const newReq = addTokenToRequest(req, token);
          return next(newReq);
        }
        return throwError(() => new Error('Token refresh failed'));
      })
    );
  }
}

function addTokenToRequest(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function isAuthEndpoint(url: string): boolean {
  const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/reset-password'];
  return authEndpoints.some(endpoint => url.includes(endpoint));
}

function handleLogout(authService: AuthService, router: Router): void {
  console.log('🚪 [REFRESH INTERCEPTOR] Handling logout...');
  authService.logout();
  router.navigate(['/login'], { 
    queryParams: { message: 'Session expirée, veuillez vous reconnecter' }
  });
}