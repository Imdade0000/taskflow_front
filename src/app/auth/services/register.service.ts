import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { RegisterRequest, RegisterResponse } from '../models/register.models';
import { environment } from '../../../environments/environments';

@Injectable({ providedIn: 'root' })
export class RegisterService {
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
   * Inscription d'un nouvel utilisateur
   */
  register(userData: Omit<RegisterRequest, 'roleId'>): Observable<RegisterResponse> {
    const payload: RegisterRequest = {
      ...userData,
      roleId: 'd332e4e5-bc99-49a8-b410-0021b3527b9f' // Valeur par défaut
    };

    console.log('🔍 Début inscription:', { 
      email: payload.email, 
      username: payload.username,
      twoFactorEnabled: payload.twoFactorEnabled 
    });

    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, payload, this.httpOptions).pipe(
      tap((response) => {
        console.log('✅ Réponse inscription:', response);
        this.handleRegistrationSuccess(response, payload.twoFactorEnabled);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur inscription:', error);
        return throwError(() => this.getRegisterErrorMessage(error));
      })
    );
  }

  /**
   * Vérifier la disponibilité d'un email
   */
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.post<{ available: boolean }>(
      `${this.apiUrl}/check-email`,
      { email },
      this.httpOptions
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur vérification email:', error);
        return throwError(() => new Error('Erreur lors de la vérification de l\'email'));
      })
    );
  }

  /**
   * Vérifier la disponibilité d'un nom d'utilisateur
   */
  checkUsernameAvailability(username: string): Observable<{ available: boolean }> {
    return this.http.post<{ available: boolean }>(
      `${this.apiUrl}/check-username`,
      { username },
      this.httpOptions
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur vérification username:', error);
        return throwError(() => new Error('Erreur lors de la vérification du nom d\'utilisateur'));
      })
    );
  }

  /**
   * Renvoyer le code de vérification d'inscription
   */
  resendVerificationCode(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/resend-verification`,
      { email },
      this.httpOptions
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur renvoi code:', error);
        return throwError(() => new Error(
          error.error?.message || 'Erreur lors du renvoi du code de vérification'
        ));
      })
    );
  }

  /**
   * Activer un compte avec un code de vérification
   */
  activateAccount(data: { email: string; code: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/activate`,
      data,
      this.httpOptions
    ).pipe(
      tap((response) => {
        console.log('✅ Compte activé:', response);
        // Rediriger vers la page de connexion avec un message de succès
        this.router.navigate(['/login'], {
          queryParams: { 
            activated: true,
            message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.'
          }
        });
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur activation:', error);
        return throwError(() => new Error(
          error.error?.message || 'Erreur lors de l\'activation du compte'
        ));
      })
    );
  }

  /**
   * Gestion du succès d'inscription
   */
  private handleRegistrationSuccess(response: RegisterResponse, is2faEnabled: boolean = false): void {
    // Vérifier si la réponse contient un ID utilisateur (peut être 'id', 'userId', ou dans 'user.id')
    const userId = (response as any).userId || (response as any).id || (response as any).user?.id;
    
    if (is2faEnabled && userId) {
      // L'utilisateur a activé la 2FA lors de l'inscription
      // Stocker le contexte pour la vérification
      localStorage.setItem('2faContext', 'register');
      
      console.log('🔍 Redirection vers verify-2fa pour inscription avec 2FA');
      
      this.router.navigate(['/verify-2fa'], {
        state: { 
          context: 'register',
          email: response.email,
          userId: userId,
          message: 'Configurez votre authentification à deux facteurs pour finaliser votre inscription'
        }
      });
    } else if ((response as any).requiresEmailVerification || (response as any).requires_email_verification) {
      // L'utilisateur doit vérifier son email
      console.log('🔍 Redirection vers verify-email');
      
      this.router.navigate(['/verify-email'], {
        state: { 
          email: response.email,
          message: 'Un code de vérification a été envoyé à votre adresse email'
        }
      });
    } else {
      // Inscription terminée, redirection vers login
      console.log('🔍 Redirection vers login après inscription réussie');
      
      this.router.navigate(['/login'], {
        queryParams: { 
          registered: true,
          message: 'Inscription réussie. Vous pouvez maintenant vous connecter.'
        }
      });
    }
  }

  /**
   * Gestion des messages d'erreur d'inscription
   */
  private getRegisterErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 400:
        // Erreur de validation
        if (error.error?.details) {
          return `Données invalides: ${error.error.details}`;
        }
        return error.error?.message || 'Données invalides. Veuillez vérifier les champs.';
      
      case 409:
        // Conflit - ressource déjà existante
        if (error.error?.field === 'email') {
          return 'Un compte existe déjà avec cet email.';
        } else if (error.error?.field === 'username') {
          return 'Ce nom d\'utilisateur est déjà pris.';
        }
        return 'Un compte existe déjà avec ces informations.';
      
      case 422:
        // Erreur de traitement
        return error.error?.message || 'Les données fournies ne peuvent pas être traitées.';
      
      case 429:
        // Limite de débit atteinte
        return 'Trop de tentatives. Veuillez réessayer plus tard.';
      
      case 500:
        // Erreur serveur
        return 'Erreur interne du serveur. Veuillez réessayer plus tard.';
      
      case 503:
        // Service indisponible
        return 'Service temporairement indisponible. Veuillez réessayer plus tard.';
      
      default:
        return error.error?.message || 'Erreur lors de l\'inscription. Veuillez réessayer.';
    }
  }

  /**
   * Vérifier le statut d'une inscription
   */
  checkRegistrationStatus(email: string): Observable<{ 
    status: 'pending' | 'verified' | 'expired' | 'not_found';
    message: string;
  }> {
    return this.http.post<{ 
      status: 'pending' | 'verified' | 'expired' | 'not_found';
      message: string;
    }>(
      `${this.apiUrl}/registration-status`,
      { email },
      this.httpOptions
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur vérification statut:', error);
        return throwError(() => new Error('Erreur lors de la vérification du statut'));
      })
    );
  }

  /**
   * Nettoyer les données d'inscription temporaires
   */
  clearRegistrationData(): void {
    // Nettoyer seulement les données liées à l'inscription
    if (localStorage.getItem('2faContext') === 'register') {
      localStorage.removeItem('2faContext');
    }
  }
}