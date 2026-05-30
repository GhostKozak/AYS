import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Check application health (auth required)' })
  check() {
    return this.health.check([
      // MongoDB check
      () => this.mongoose.pingCheck('mongodb'),
      // Memory heap check (max 300MB — NestJS with PDF/Excel needs headroom)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Disk storage check
      () =>
        this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }
}
