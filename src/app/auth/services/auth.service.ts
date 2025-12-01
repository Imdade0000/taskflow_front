import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, map } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoginModel } from '../models/login.models';
import { environment } from '../../../environments/environments';

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tempToken?: string;
  requiresTwoFactor?: boolean;
  requires2FA?: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }),
    withCredentials: true
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    const token = localStorage.getItem('accessToken');
    const tempToken = localStorage.getItem('tempToken');
    
    // Si on a un token temporaire, on est en cours de 2FA
    if (tempToken && !token) {
      return false;
    }
    
    return !!token;
  }

  /**
   * Vérifie si une vérification 2FA est en cours
   */
  is2FAInProgress(): boolean {
    return !!localStorage.getItem('2faContext');
  }

  /**
   * Récupère le contexte 2FA actuel
   */
  get2FAContext(): string | null {
    return localStorage.getItem('2faContext');
  }

  /**
   * Connexion utilisateur
   */
  login(credentials: LoginModel): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      credentials,
      this.httpOptions
    ).pipe(
      tap(response => {
        console.log('🔍 Réponse complète du login:', response);
        console.log('🔍 requires2FA:', response.requires2FA);
        console.log('🔍 requiresTwoFactor:', response.requiresTwoFactor);
        console.log('🔍 tempToken présent:', !!response.tempToken);
        console.log('🔍 accessToken présent:', !!response.accessToken);
        
        // Vérifier les différentes variantes de la propriété 2FA
        const needs2FA = response.requires2FA || 
                         response.requiresTwoFactor || 
                         (response as any).requires_2fa || 
                         (response as any).require_2fa ||
                         (response as any).twoFactorRequired;
        
        const tempToken = response.tempToken || 
                         (response as any).temp_token || 
                         (response as any).temporaryToken;
        
        console.log('🔍 needs2FA (après vérification):', needs2FA);
        console.log('🔍 tempToken (après vérification):', !!tempToken);
        
        if (needs2FA) {
          console.log('🔍 Utilisateur nécessite 2FA');
          
          if (tempToken) {
            // Stockage du token temporaire pour la vérification 2FA
            localStorage.setItem('tempToken', tempToken);
            localStorage.setItem('2faContext', 'login');
            
            const userId = response.user?.id || 
                          (response as any).userId || 
                          (response as any).user_id;
            
            console.log('🔍 Redirection vers verify-2fa avec userId:', userId);
            
            this.router.navigate(['/verify-2fa'], {
              state: { 
                context: 'login', 
                userId: userId,
                email: response.user?.email
              }
            });
          } else {
            console.log('⚠️ 2FA requis mais pas de token temporaire - déclenchement manuel');
            // Si pas de token temporaire, déclencher l'envoi du code 2FA
            // Utiliser l'identifiant depuis credentials (username, email, etc.)
            const identifier = (credentials as any).email || 
                             (credentials as any).username || 
                             (credentials as any).identifier ||
                             (credentials as any).login;
            
            this.trigger2FA(identifier).subscribe({
              next: (trigger2FAResponse) => {
                console.log('✅ Code 2FA envoyé:', trigger2FAResponse);
                localStorage.setItem('2faContext', 'login');
                this.router.navigate(['/verify-2fa'], {
                  state: { 
                    context: 'login', 
                    userId: response.user?.id,
                    email: response.user?.email
                  }
                });
              },
              error: (error) => {
                console.error('❌ Erreur envoi code 2FA:', error);
              }
            });
          }
        } else if (response.accessToken) {
          console.log('🔍 Connexion standard réussie');
          // Connexion standard réussie
          localStorage.setItem('accessToken', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          this.router.navigate(['/dashboard']);
        } else {
          console.log('⚠️ Réponse inattendue:', response);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur login:', error);
        return throwError(() => new Error(
          error.error?.message || 'Échec de la connexion. Veuillez réessayer.'
        ));
      })
    );
  }

  /**
   * Vérification du code 2FA
   */
  verify2FA(data: { userId: string; code: string }): Observable<AuthResponse> {
    // Récupérer le contexte
    const context = localStorage.getItem('2faContext');
    
    console.log('🔍 Début verify2FA:', { 
      userId: data.userId, 
      hasCode: !!data.code, 
      context 
    });

    // Validation des données d'entrée
    if (!data.userId || !data.code) {
      return throwError(() => new Error('Données de vérification incomplètes'));
    }

    // Pour le contexte login, vérifier le tempToken
    if (context === 'login') {
      const tempToken = localStorage.getItem('tempToken');
      if (!tempToken) {
        return throwError(() => new Error('Session expirée. Veuillez vous reconnecter.'));
      }
      console.log('🔍 TempToken présent:', !!tempToken);
    }

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/verify-2fa`,
      {
        userId: data.userId,
        code: data.code,
        context: context // Envoyer le contexte au backend
      },
      this.httpOptions
    ).pipe(
      tap((response) => {
        console.log('✅ Réponse verify2FA:', response);
        
        // Nettoyage après vérification réussie
        localStorage.removeItem('tempToken');
        localStorage.removeItem('2faContext');
        
        // Gestion selon le contexte
        if (context === 'register') {
          // Après vérification d'inscription
          this.router.navigate(['/login'], {
            queryParams: { 
              verified: true,
              message: 'Compte vérifié avec succès. Vous pouvez maintenant vous connecter.'
            }
          });
        } else {
          // Après vérification de login
          if (response.accessToken) {
            localStorage.setItem('accessToken', response.accessToken);
          }
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError((error) => {
        console.error('❌ Erreur verify2FA:', error);
        
        let errorMessage = 'Erreur lors de la vérification 2FA';
        
        if (error.status === 400) {
          errorMessage = error.error?.message || 'Requête invalide';
        } else if (error.status === 401) {
          errorMessage = 'Code invalide ou expiré';
          if (context === 'login') {
            localStorage.removeItem('tempToken');
          }
        } else if (error.status === 403) {
          errorMessage = 'Token temporaire invalide';
          localStorage.removeItem('tempToken');
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Déclencher l'envoi d'un code 2FA (si le backend ne le fait pas automatiquement)
   */
  trigger2FA(emailOrUsername: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/trigger-2fa`, { 
      identifier: emailOrUsername 
    }, this.httpOptions);
  }

  /**
   * Renvoyer le code 2FA
   */
  resend2FACode(userId: string): Observable<any> {
    const context = localStorage.getItem('2faContext');
    
    return this.http.post(`${this.apiUrl}/resend-2fa`, { 
      userId,
      context 
    }, this.httpOptions);
  }

  /**
   * Déconnexion utilisateur
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, this.httpOptions).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        // Même en cas d'erreur, nettoyer les données locales
        this.clearAuthData();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  public userHasRoles(requiredRoles: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  
  const user = this.getCurrentUser();
  const userRoles = user?.roles || [];
  
  return requiredRoles.some(role => userRoles.includes(role));
}

  /**
   * Actualisation du token
   */
refreshToken(): Observable<AuthResponse> {
  const refreshToken = localStorage.getItem('refreshToken');
  const tempToken = localStorage.getItem('tempToken');

  if (tempToken && !refreshToken) {
    // 🚫 En cours de 2FA → ne pas tenter de refresh
    return throwError(() => new Error('2FA en cours, refresh interdit'));
  }

  if (!refreshToken) {
    return throwError(() => new Error('No refresh token available'));
  }

  return this.http.post<AuthResponse>(
    `${this.apiUrl}/refresh`,
    { refreshToken },
    this.httpOptions
  ).pipe(
    tap(response => {
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
    }),
    catchError(error => {
      this.clearAuthData();
      this.router.navigate(['/login']);
      return throwError(() => error);
    })
  );
}


  /**
   * Obtenir le token d'accès
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Obtenir les informations utilisateur stockées
   */
  getCurrentUser(): any {
  const token = this.getToken();
  if (token) {
    try {
      // Décoder le JWT pour obtenir les infos utilisateur
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Log pour debug - à retirer en production
      console.log('Payload JWT décodé:', payload);
      
      // Assurez-vous que le payload contient un identifiant utilisateur
      // Les propriétés courantes dans les JWT sont: id, sub, userId, user_id
      if (payload.id) {
        return payload;
      } else if (payload.sub) {
        // 'sub' est la propriété standard JWT pour l'identifiant du sujet
        return { ...payload, id: payload.sub };
      } else if (payload.userId) {
        return { ...payload, id: payload.userId };
      } else if (payload.user_id) {
        return { ...payload, id: payload.user_id };
      } else {
        console.warn('Aucun identifiant utilisateur trouvé dans le token JWT:', payload);
        return payload; // Retourner quand même le payload
      }
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      return null;
    }
  }
  return null;
}

  /**
   * Vérifier si le token est expiré
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Nettoyer toutes les données d'authentification
   */
  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tempToken');
    localStorage.removeItem('2faContext');
  }

   sendPasswordResetEmail(email: string): Observable<any> {
    console.log('🔍 Envoi vers:', `${this.apiUrl}/forgot-password`); // Debug
    
    return this.http.post(
      `${this.apiUrl}/forgot-password`, // http://localhost:3000/api/auth/forgot-password
      { email },
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.error('Error sending password reset email:', error);
        return throwError(() => new Error(
          error.error?.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation'
        ));
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    console.log('🔍 Reset vers:', `${this.apiUrl}/reset-password`); // Debug
    
    return this.http.post(
      `${this.apiUrl}/reset-password`, // http://localhost:3000/api/auth/reset-password
      { 
        token, 
        newPassword 
      },
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.error('Error resetting password:', error);
        return throwError(() => error);
      })
    );
  }

  validateResetToken(token: string): Observable<boolean> {
    console.log('🔍 Validation vers:', `${this.apiUrl}/validate-reset-token`); // Debug
    console.log('🔍 Token:', token); // Debug
    
    return this.http.get<{valid: boolean}>(
      `${this.apiUrl}/validate-reset-token`, // http://localhost:3000/api/auth/validate-reset-token
      { 
        params: { token },
        ...this.httpOptions
      }
    ).pipe(
      tap(response => {
        console.log('🔍 Réponse validation:', response); // Debug
      }),
      map(response => response.valid),
      catchError(error => {
        console.error('Validation error:', error);
        return of(false);
      })
    );
  }

  
}