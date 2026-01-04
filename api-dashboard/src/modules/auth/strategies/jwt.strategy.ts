import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'dashboard-secret-key'),
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
