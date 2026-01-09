import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production');
    console.log('[JwtStrategy] Using JWT_SECRET:', jwtSecret ? `${jwtSecret.substring(0, 5)}...` : 'NOT SET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      brandId: payload.brandId,
      branchId: payload.branchId,
      username: payload.username,
      role: payload.role,
    };
  }
}
