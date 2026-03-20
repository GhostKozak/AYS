import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { SeedService } from './seed.service';
import { I18nService } from 'nestjs-i18n';

@Controller('seed')
export class SeedController {
  constructor(
    private readonly seedService: SeedService, 
    private readonly i18n: I18nService
  ) {}

  @Post('admin')
  async createAdmin(@Headers('x-seed-secret') secret: string) {
    if (!process.env.SEED_ADMIN_SECRET || secret !== process.env.SEED_ADMIN_SECRET) {
      throw new UnauthorizedException('Invalid or missing seed secret');
    }

    await this.seedService.seedAdminUser();
    return { message: this.i18n.translate('seed.ADMIN_USER_CREATED') };
  }
} 