import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string, ipAddress?: string): Promise<any> {
    const user = await this.usersService.findForAuth(email);
    if (!user) return null;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Hesabınız çok fazla hatalı giriş nedeniyle kilitlendi. Lütfen daha sonra tekrar deneyin.');
    }

    if (await bcrypt.compare(password, user.password)) {
      await this.usersService.resetFailedLogins(user._id as string);
      // user is already a POJO because of .lean() in findForAuth
      const { password: userPassword, ...result } = user;
      return result;
    }

    await this.usersService.incrementFailedLogins(user._id as string);
    this.auditService.log({
      user: 'SYSTEM',
      action: 'LOGIN_FAILED',
      entity: 'Auth',
      entityId: user._id as string,
      oldValue: null,
      newValue: { email },
      ipAddress,
    }).catch(err => console.error('Audit log failed', err));

    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    
    // Update last login time (Detached)
    setImmediate(() => {
      this.usersService.updateLastLogin(user._id).catch(err => console.error('Last login update failed', err));
    });
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
} 