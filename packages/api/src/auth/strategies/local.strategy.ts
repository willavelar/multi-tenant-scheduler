import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { TenantRequest } from '../../common/middleware/tenant.middleware';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  validate(req: TenantRequest, email: string, password: string) {
    return this.authService.validateUser(email, password, req.tenantId!);
  }
}
