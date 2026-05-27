import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';

const REFRESH_TOKEN_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(
    email: string,
    password: string,
    ipAddress?: string,
  ): Promise<any> {
    const user = await this.usersService.findForAuth(email);
    if (!user) return null;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Hesabınız çok fazla hatalı giriş nedeniyle kilitlendi. Lütfen daha sonra tekrar deneyin.',
      );
    }

    if (await bcrypt.compare(password, user.password)) {
      await this.usersService.resetFailedLogins(user._id as string);
      // user is already a POJO because of .lean() in findForAuth
      const result = { ...user } as Record<string, unknown>;
      delete result.password;
      return result;
    }

    await this.usersService.incrementFailedLogins(user._id as string);
    this.auditService
      .log({
        user: email,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: user._id as string,
        oldValue: null,
        newValue: { email },
        ipAddress,
      })
      .catch((err) => this.logger.error('Audit log failed', err instanceof Error ? err.stack : err));

    return null;
  }

  async login(user: {
    _id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  }) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user._id);

    // Update last login time (Detached)
    setImmediate(() => {
      this.usersService
        .updateLastLogin(user._id)
        .catch((err) => this.logger.error('Last login update failed', err instanceof Error ? err.stack : err));
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const user = await this.usersService.findByRefreshToken(refreshToken);
    if (!user) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    const payload = {
      email: user.email,
      sub: (user._id as string).toString(),
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(
      (user._id as string).toString(),
    );

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = randomUUID();
    const hash = createHash('sha256').update(token).digest('hex');
    await this.usersService.storeRefreshToken(
      userId,
      hash,
      new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    );
    return token;
  }
}
