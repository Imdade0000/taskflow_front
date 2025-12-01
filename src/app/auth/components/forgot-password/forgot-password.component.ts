// forgot-password.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {

     forgotPasswordForm: FormGroup; // Déclarez le type sans initialisation
  
  constructor(private fb: FormBuilder, private authService: AuthService) {
    // Initialisez dans le constructeur
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

    get emailControl() {
    return this.forgotPasswordForm.get('email');
  }

  isLoading = false;
  message = '';
  isError = false;



  onSubmit() {
    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;
    this.message = '';
    this.isError = false;

    const email = this.forgotPasswordForm.value.email as string;

    this.authService.sendPasswordResetEmail(email).subscribe({
      next: () => {
        this.message = 'Un email de réinitialisation a été envoyé à votre adresse.';
        this.isError = false;
        this.isLoading = false;
      },
      error: (err) => {
        this.message = err.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.isError = true;
        this.isLoading = false;
      }
    });
  }
}