// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Si l'utilisateur est en cours de 2FA
    if (this.authService.is2FAInProgress()) {
      const context = this.authService.get2FAContext();
      return this.router.createUrlTree(['/verify-2fa'], {
        queryParams: { 
          context,
          returnUrl: state.url 
        }
      });
    }

    // Si l'utilisateur est connecté et que le token n'est pas expiré
    if (this.authService.isLoggedIn() && !this.authService.isTokenExpired()) {
      return true;
    }

    // Si le token est expiré mais qu'on a un refresh token
    if (this.authService.isTokenExpired() && localStorage.getItem('refreshToken')) {
      return this.authService.refreshToken().pipe(
        map(() => true),
        catchError(() => {
          this.authService.logout(); // Utilisez la méthode publique logout() au lieu de clearAuthData()
          return of(this.router.createUrlTree(['/login'], { 
            queryParams: { returnUrl: state.url } 
          }));
        })
      );
    }

    // Redirection vers login avec l'URL de retour
    return this.router.createUrlTree(['/login'], { 
      queryParams: { returnUrl: state.url } 
    });
  }
}