// no-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {
    
    // Si l'utilisateur est déjà connecté et n'a pas besoin de 2FA
    if (this.authService.isLoggedIn() && !this.authService.isTokenExpired() && !this.authService.is2FAInProgress()) {
      return this.router.createUrlTree(['/dashboard']);
    }

    return true;
  }
}