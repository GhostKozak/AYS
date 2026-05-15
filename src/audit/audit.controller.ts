import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Invalid or missing token',
})
@ApiForbiddenResponse({
  description: 'Forbidden - Insufficient permissions (Admin only)',
})
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiQuery({
    name: 'entity',
    description: 'Filter by entity type (e.g., User, Company)',
    required: false,
  })
  @ApiQuery({
    name: 'entityId',
    description: 'Filter by specific entity ID',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Return all audit logs matching criteria',
  })
  findAll(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    const query: Record<string, string> = {};
    if (entity) query.entity = entity;
    if (entityId) query.entityId = entityId;
    return this.auditService.findAll(query);
  }
}
