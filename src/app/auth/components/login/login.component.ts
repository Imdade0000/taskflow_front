import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginModel } from '../../models/login.models';
import { AuthResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy {
  private formBuilder = inject(FormBuilder);
  private loginService = inject(AuthService);
  private router = inject(Router);

  private loginSubscription: Subscription | null = null;

  loginForm = this.formBuilder.nonNullable.group({
    'username': ['', [Validators.required]],
    'password': ['', [Validators.required, Validators.minLength(8)]]
  });

  isLoading = false;
  errorMessage: string = '';

  login(): void {
    if (this.loginForm.invalid) return;

    const credentials: LoginModel = {
      username: this.loginForm.value.username as string,
      password: this.loginForm.value.password as string
    };

    this.isLoading = true;
    this.errorMessage = '';

    this.loginSubscription = this.loginService.login(credentials).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;

        if (response.requiresTwoFactor) {
          if (response.tempToken) {
            localStorage.setItem('tempToken', response.tempToken);
          }
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }

          this.router.navigate(['/verify-2fa'], {
            state: { email: credentials.username }
          });
        } else {
          this.handleSuccessfulLogin(response);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(err);
        console.error('Login error:', err);
      }
    });
  }

  private handleSuccessfulLogin(response: any): void {
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    this.router.navigate(['/dashboard']);
  }

  private getErrorMessage(error: any): string {
    if (error.status === 401) {
      return 'Email ou mot de passe incorrect';
    }
    if (error.status === 403) {
      return 'Compte non activé';
    }
    if (error.status === 429) {
      return 'Trop de tentatives. Veuillez réessayer plus tard';
    }
    return 'Une erreur est survenue. Veuillez réessayer';
  }

  navigateHome() {
    this.router.navigate(['home']);
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
  }
}
