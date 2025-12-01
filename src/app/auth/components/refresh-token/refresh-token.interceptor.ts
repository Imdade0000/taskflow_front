// refresh-token.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    
    // Ajouter le token à toutes les requêtes (sauf login/register)
    if (token && !this.isAuthEndpoint(request.url)) {
      request = this.addTokenHeader(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Ne pas tenter de refresh pour les endpoints d'auth
    if (this.isAuthEndpoint(request.url)) {
      return throwError(() => new Error('Authentication failed'));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        console.warn('[Interceptor] No refresh token found');
        this.handleLogout();
        return EMPTY;
      }

      console.log('[Interceptor] Attempting to refresh token...');

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          console.log('[Interceptor] Token refreshed successfully');
          this.isRefreshing = false;
          
          const newToken = response.accessToken || this.authService.getToken();
          this.refreshTokenSubject.next(newToken);

          // Retry la requête originale avec le nouveau token
          return next.handle(this.addTokenHeader(request, newToken));
        }),
        catchError(err => {
          console.error('[Interceptor] Token refresh failed:', err);
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          this.handleLogout();
          return throwError(() => err);
        })
      );
    } else {
      // Si un refresh est déjà en cours, attendre qu'il se termine
      console.log('[Interceptor] Refresh in progress, waiting...');
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          if (token) {
            return next.handle(this.addTokenHeader(request, token));
          } else {
            return throwError(() => new Error('Token refresh failed'));
          }
        })
      );
    }
  }

  private isAuthEndpoint(url: string): boolean {
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/reset-password'];
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  private handleLogout(): void {
    console.log('[Interceptor] Handling logout');
    this.authService.logout();
    this.router.navigate(['/login'], { 
      queryParams: { message: 'Session expirée, veuillez vous reconnecter' }
    });
  }
}