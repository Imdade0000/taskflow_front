import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { ErrorInterceptor } from './interceptors/error.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RegisterService } from './services/register.service';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    // Importez les composants standalone ici si nécessaire
  ],
  providers: [
    RegisterService,
    AuthService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
})
export class AuthModule {}