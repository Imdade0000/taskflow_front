// src/app/auth/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  console.log('🔍 [AUTH INTERCEPTOR] Processing request:', req.url);
  
  const token = authService.getToken();
  
  if (token && !isAuthEndpoint(req.url)) {
    console.log('🔍 [AUTH INTERCEPTOR] Adding token to request');
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};

function isAuthEndpoint(url: string): boolean {
  const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
  return authEndpoints.some(endpoint => url.includes(endpoint));
}