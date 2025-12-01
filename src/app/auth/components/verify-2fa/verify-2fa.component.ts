import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { JwtService } from '../../services/jwt.service';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-2fa.component.html'
})
export class Verify2faComponent implements OnInit {
  private authService = inject(AuthService);
  public router = inject(Router);
  private jwtService = inject(JwtService);
  
  // États du composant
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  isTokenValid: boolean = true;
  userId: string | null = null;
  email: string | null = null;

  // Formulaire avec validation
  codeForm = new FormGroup({
    code: new FormControl(
      { value: '', disabled: false }, 
      [
        Validators.required, 
        Validators.pattern(/^\d{6}$/),
        Validators.minLength(6),
        Validators.maxLength(6)
      ]
    )
  });

  ngOnInit() {
    this.validateToken();
  }

  private validateToken(): void {
    const tempToken = localStorage.getItem('tempToken');
    if (!tempToken) {
      this.handleTokenError('Session expirée, veuillez vous reconnecter');
      return;
    }

    try {
      const payload = this.jwtService.decode(tempToken);
      const isExpired = payload.exp ? (payload.exp * 1000 < Date.now()) : true;
      
      if (isExpired) {
        this.handleTokenError('Le code a expiré, veuillez en demander un nouveau');
      } else if (!payload.sub) {
        this.handleTokenError('Session invalide - identifiant manquant');
      } else {
        this.userId = payload.sub;
        this.email = payload.email || null; // Stocker l'email si disponible
      }
    } catch (error) {
      console.error('Token decoding error:', error);
      this.handleTokenError('Session invalide');
    }
  }

  onSubmit() {
    if (this.codeForm.invalid || this.isLoading || !this.isTokenValid || !this.userId) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.codeForm.disable();

    const payload = {
      userId: this.userId,
      code: this.codeForm.get('code')?.value as string
    };

    this.authService.verify2FA(payload).subscribe({
      next: (response) => {
        this.handleSuccess(response);
      },
      error: (err) => {
        this.handleError(this.getErrorMessage(err));
      }
    });
  }

  private handleSuccess(response: any): void {
    this.isLoading = false;
    this.successMessage = 'Authentification réussie !';
    
    // Stockage des tokens
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    
    // Nettoyage
    localStorage.removeItem('tempToken');
    this.codeForm.enable();
    
    // Redirection
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 1500);
  }

  private handleError(message: string): void {
    this.isLoading = false;
    this.errorMessage = message;
    this.codeForm.enable();
    
    if (message.includes('expiré') || message.includes('invalide')) {
      this.isTokenValid = false;
      localStorage.removeItem('tempToken');
    }
  }

  private handleTokenError(message: string): void {
    this.isTokenValid = false;
    this.errorMessage = message;
    this.codeForm.disable();
    localStorage.removeItem('tempToken');
  }

  resendCode() {
    if (this.isLoading || !this.userId) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resend2FACode(this.userId).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isTokenValid = true;
        this.successMessage = response.message || 'Un nouveau code a été envoyé';
        
        if (response.tempToken) {
          localStorage.setItem('tempToken', response.tempToken);
        }
        
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.handleError(this.getErrorMessage(err));
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 400) return error.error?.message || 'Requête invalide';
    if (error.status === 401) return 'Code invalide ou expiré';
    if (error.status === 404) return 'Session introuvable';
    return error.error?.message || 'Une erreur est survenue';
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    value = value.substring(0, 6);
    this.codeForm.get('code')?.setValue(value, { emitEvent: false });
  }

  // Getters pour le template
  get codeControl() {
    return this.codeForm.get('code');
  }

  get showCodeError() {
    return this.codeControl?.invalid && 
           (this.codeControl?.dirty || this.codeControl?.touched) &&
           this.isTokenValid;
  }
}