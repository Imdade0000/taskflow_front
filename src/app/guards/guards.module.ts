// guards.module.ts
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthGuard } from './auth.guard';
import { TwoFactorGuard } from './two-factor.guard';
import { NoAuthGuard } from './no-auth.guard';
import { RefreshTokenInterceptor } from '../auth/components/refresh-token/refresh-token.interceptor';

@NgModule({
  providers: [
    AuthGuard,
    TwoFactorGuard,
    NoAuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RefreshTokenInterceptor,
      multi: true
    }
  ]
})
export class GuardsModule { }