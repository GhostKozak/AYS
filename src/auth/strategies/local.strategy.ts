import { Strategy } from 'passport-local';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private readonly i18n: I18nService,
  ) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    email: string,
    password: string,
  ): Promise<unknown> {
    const user = (await this.authService.validateUser(
      email,
      password,
      req.ip,
    )) as unknown;
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.INVALID_CREDENTIALS'),
      );
    }
    return user;
  }
}
