import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { SeedService } from './seed.service';
import { I18nService } from 'nestjs-i18n';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
    private readonly i18n: I18nService,
  ) {}

  @Post('admin')
  @ApiOperation({ summary: 'Seed the initial admin user' })
  @ApiHeader({
    name: 'x-seed-secret',
    description: 'Security secret for seeding the admin',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing seed secret' })
  async createAdmin(@Headers('x-seed-secret') secret: string) {
    const expectedSecret = process.env.SEED_ADMIN_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing seed secret');
    }

    await this.seedService.seedAdminUser();
    return { message: this.i18n.translate('seed.ADMIN_USER_CREATED') };
  }

  @Post('all')
  @ApiOperation({ summary: 'Seed comprehensive test data for development' })
  @ApiHeader({
    name: 'x-seed-secret',
    description: 'Security secret for seeding test data',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'All test data seeded successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing seed secret' })
  async seedAllData(@Headers('x-seed-secret') secret: string) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new ForbiddenException(
        'Comprehensive seeding is disabled in production.',
      );
    }

    const expectedSecret = process.env.SEED_ALL_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing seed secret');
    }

    await this.seedService.seedAllData();
    return { message: 'Comprehensive test data seeded successfully' };
  }
}

