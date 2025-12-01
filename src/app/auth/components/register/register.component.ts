import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { RegisterService } from '../../services/register.service';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnDestroy {
  private formBuilder = inject(FormBuilder);
  private registerService = inject(RegisterService);
  private router = inject(Router);

  private registerSubscription: Subscription | null = null;

  roles = [
    { id: 'a1710c71-a9f7-4be3-b17d-c2733a8d65ff', name: 'Super Admin' },
    { id: '8d51a28e-6ca8-48d0-b5ab-c1ae162acaf7', name: 'Project Manager' },
    { id: '35532b42-b492-49a9-b5e2-676a16d924e5', name: 'System Administrator'},
    { id: 'c124e591-cf14-446f-aba9-976aba57db58', name: 'Developer'},
    { id: 'bbb46328-a0a3-476a-ae18-86c219147d68', name: 'Team Lead'},
    { id: 'fcf5d195-7693-48f2-8844-615989424110', name: 'Viewer'},
    // ... autres rôles
  ];

  registerForm = this.formBuilder.nonNullable.group({
    firstname: ['', [Validators.required]],
    lastname: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    roleId: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    twoFactorEnabled: [true] // ✅ Maintenant correctement activé par défaut
  }, {
    validators: this.mustMatch('password', 'confirmPassword')
  });

  isLoading = false;
  errorMessage: string = '';

  // Validateur personnalisé pour la correspondance des mots de passe
  private mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);

      // Retourne null si les contrôles n'existent pas
      if (!control || !matchingControl) {
        return null;
      }

      // Ne pas écraser les erreurs existantes
      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        return null;
      }

      // Définit l'erreur si les valeurs ne correspondent pas
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
        return { mustMatch: true };
      } else {
        matchingControl.setErrors(null);
        return null;
      }
    };
  }

  register(): void {
    if (this.registerForm.invalid) return;

    const { confirmPassword, ...userData } = this.registerForm.getRawValue();
    
    // 🔍 Debug: Afficher les données envoyées
    console.log('🔍 Données d\'inscription envoyées:', userData);
    console.log('🔍 twoFactorEnabled:', userData.twoFactorEnabled);
    
    this.isLoading = true;
    this.errorMessage = '';

    this.registerSubscription = this.registerService.register(userData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('✅ Réponse d\'inscription:', response);
        this.handleSuccessfulRegistration(response);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(err);
        console.error('❌ Erreur d\'inscription:', err);
      }
    });
  }

  private handleSuccessfulRegistration(response: any): void {
    console.log('🔍 Gestion de l\'inscription réussie:', response);
    
    // ✅ Logique améliorée pour la gestion post-inscription
    if (response.requiresEmailVerification || response.requires2FA || response.requiresTwoFactor) {
      // Si une vérification est requise (email ou 2FA)
      console.log('🔍 Vérification requise, redirection vers verify-2fa');
      
      // Stocker le contexte pour la vérification
      localStorage.setItem('2faContext', 'register');
      
      this.router.navigate(['/verify-2fa'], {
        state: { 
          context: 'register',
          email: this.registerForm.value.email,
          userId: response.userId || response.user?.id,
          message: 'Un code de vérification a été envoyé à votre adresse email.'
        }
      });
    } else {
      // Inscription terminée, redirection vers login
      console.log('🔍 Inscription terminée, redirection vers login');
      this.router.navigate(['/login'], {
        queryParams: { 
          registered: 'true',
          message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.'
        }
      });
    }
  }

  private getErrorMessage(error: any): string {
    if (error.status === 400) {
      return 'Données invalides. Veuillez vérifier les champs';
    }
    if (error.status === 409) {
      return 'Un compte existe déjà avec cet email ou ce nom d\'utilisateur';
    }
    if (error.status === 429) {
      return 'Trop de tentatives. Veuillez réessayer plus tard';
    }
    return "Une erreur est survenue lors de l'inscription";
  }

  // ✅ Méthode pour basculer la 2FA (optionnel)
  toggle2FA(): void {
    const currentValue = this.registerForm.get('twoFactorEnabled')?.value;
    this.registerForm.patchValue({
      twoFactorEnabled: !currentValue
    });
    console.log('🔍 2FA basculé:', !currentValue);
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.registerSubscription?.unsubscribe();
  }
}