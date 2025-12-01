import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  form: FormGroup;
  tokenValid: boolean = false;
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    public router: Router
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.validateToken();
  }

  validateToken(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Token à valider:', this.token); // Debug
    
    this.authService.validateResetToken(this.token).subscribe({
      next: (isValid: boolean) => {
        console.log('Réponse validation token:', isValid); // Debug
        this.tokenValid = isValid;
        if (!isValid) {
          this.error = "Le lien de réinitialisation est invalide ou a expiré";
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur validation token:', err); // Debug
        this.error = "Erreur lors de la validation du lien";
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid && this.tokenValid) {
      this.loading = true;
      this.error = null;
      
      console.log('Envoi nouveau mot de passe...'); // Debug
      
      this.authService.resetPassword(
        this.token, 
        this.form.value.newPassword
      ).subscribe({
        next: () => {
          this.router.navigate(['/login'], { 
            queryParams: { passwordReset: true } 
          });
        },
        error: (err) => {
          console.error('Erreur réinitialisation:', err); // Debug
          this.error = err.error?.message || 
                      "Erreur lors de la réinitialisation. Veuillez réessayer.";
          this.loading = false;
        }
      });
    }
  }

  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}