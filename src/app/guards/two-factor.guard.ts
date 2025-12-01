// two-factor.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TwoFactorGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {
    
    // Vérifie si un processus 2FA est en cours
    if (!this.authService.is2FAInProgress()) {
      return this.router.createUrlTree(['/login']);
    }

    // Vérifie si on a un token temporaire pour le login
    const context = this.authService.get2FAContext();
    if (context === 'login' && !localStorage.getItem('tempToken')) {
      return this.router.createUrlTree(['/login']);
    }

    return true;
  }
}