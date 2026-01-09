import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get('JWT_SECRET') || 'your-secret-key';
    console.log('[JwtStrategy] Using JWT_SECRET:', jwtSecret ? `${jwtSecret.substring(0, 5)}...` : 'NOT SET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    try {
      return await this.authService.validateToken(payload);
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }
}
