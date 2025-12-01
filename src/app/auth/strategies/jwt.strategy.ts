import { Injectable } from '@angular/core';
import { TokenService } from '../services/token.service';

@Injectable({ providedIn: 'root' })
export class JwtStrategy {
  constructor(private tokenService: TokenService) {}

  validateToken(token: string): any {
    return this.tokenService.decode(token);
  }

  getTokenPayload(): any {
    const token = this.tokenService.getToken();
    return token ? this.validateToken(token) : null;
  }
}