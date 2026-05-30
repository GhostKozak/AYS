import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipAudit } from './audit/decorators/skip-audit.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { FeedbackDto } from './app/dto/feedback.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getHello(): string {
    return 'OK';
  }

  @Post('feedback')
  @SkipAudit()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit user feedback' })
  submitFeedback(@Body() body: FeedbackDto) {
    return this.appService.submitFeedback(body);
  }
}
