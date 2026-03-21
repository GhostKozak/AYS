import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ApiBody, ApiOperation, ApiTags, ApiUnauthorizedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login to obtain JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful, returns access token and user info' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const authData = await this.authService.login(req.user);
    
    // Set secure HttpOnly cookie
    res.cookie('access_token', authData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
      path: '/',
    });

    return authData;
  }
}