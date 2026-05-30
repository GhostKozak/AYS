import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not configured');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          let token: string | null = null;
          if (req && req.cookies) {
            token = (req.cookies as Record<string, string>)['access_token'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; email: string; jti?: string; exp?: number }) {
    if (payload.jti && (await this.tokenBlacklistService.has(payload.jti))) {
      throw new UnauthorizedException('Token revoked');
    }

    const user = await this.usersService.findByIdForJwt(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Hesabınız aktif değil veya silinmiş.');
    }

    return { userId: payload.sub, email: payload.email, role: user.role, jti: payload.jti, exp: payload.exp };
  }
}
