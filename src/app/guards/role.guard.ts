// role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    
    // Récupère les rôles requis depuis la route
    const requiredRoles = next.data['roles'] as Array<string>;
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    // Vérifie si l'utilisateur a un des rôles requis
    const user = this.authService.getCurrentUser();
    const userRoles = user?.roles || [];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      this.router.navigate(['/unauthorized']);
      return false;
    }
    
    return true;
  }
}