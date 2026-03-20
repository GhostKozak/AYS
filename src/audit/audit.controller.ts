import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query('entity') entity?: string, @Query('entityId') entityId?: string) {
    const query: any = {};
    if (entity) query.entity = entity;
    if (entityId) query.entityId = entityId;
    return this.auditService.findAll(query);
  }
}
