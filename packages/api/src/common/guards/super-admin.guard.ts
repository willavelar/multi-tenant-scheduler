import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface SuperAdminJwtPayload {
  sub: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  type?: string;
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { superAdmin?: SuperAdminJwtPayload }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    let payload: SuperAdminJwtPayload;
    try {
      payload = this.jwtService.verify<SuperAdminJwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.type !== 'super_admin') throw new UnauthorizedException();

    request.superAdmin = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token ?? null : null;
  }
}
