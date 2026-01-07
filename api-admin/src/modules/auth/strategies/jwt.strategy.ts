import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use same secret as api-oauth (default: 'your-secret-key')
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; userType?: string }) {
    // Trust the JWT payload from api-oauth without database lookup
    // User authentication is handled by api-oauth service
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      userType: payload.userType,
      permissions: [], // Permissions can be fetched separately if needed
    };
  }
}
