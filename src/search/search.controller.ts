import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { AsyncSearchDto } from './dto/async-search.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedController } from '../common/decorators/authenticated-controller.decorator';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';

@ApiTags('Search')
@AuthenticatedController()
@Controller('search')
// We use a custom throttler named 'search' configured in app.module
@UseGuards(ThrottlerGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('async')
  @SkipAudit()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Initiate an asynchronous search operation' })
  @ApiResponse({
    status: 202,
    description: 'Search job accepted. Results will be pushed via WebSocket.',
  })
  @SkipThrottle({ default: true, auth: true }) // Skip default and auth throttlers so only search throttler applies
  async createAsyncSearch(@Body() dto: AsyncSearchDto, @GetUser('userId') userId: string) {
    return this.searchService.createSearchJob(dto, userId);
  }
}
