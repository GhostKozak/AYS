import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipAudit } from './audit/decorators/skip-audit.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('feedback')
  @SkipAudit()
  @ApiOperation({ summary: 'Submit user feedback' })
  submitFeedback(@Body() body: { name: string; email: string; message: string }) {
    return this.appService.submitFeedback(body);
  }
}
