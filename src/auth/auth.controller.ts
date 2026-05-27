import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { TokenBlacklistService } from './token-blacklist.service';
import {
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login to obtain JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful, returns access token and user info',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Request()
    req: ExpressRequest & {
      user: {
        _id: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
      };
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const authData = await this.authService.login(req.user);

    // Set secure HttpOnly cookie for access token
    res.cookie('access_token', authData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24, // 24 Hours (matching signOptions.expiresIn)
      path: '/',
    });

    return authData;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipAudit()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({ description: 'Tokens refreshed successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authData = await this.authService.refreshTokens(refreshToken);

    res.cookie('access_token', authData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24,
      path: '/',
    });

    return authData;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and clear the HttpOnly cookie' })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(
    @GetUser('userId') userId: string,
    @GetUser('jti') jti: string | undefined,
    @GetUser('exp') exp: number | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.clearRefreshToken(userId);
    if (jti && exp) {
      this.tokenBlacklistService.add(jti, exp);
    }

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { message: 'Logout successful' };
  }
}
