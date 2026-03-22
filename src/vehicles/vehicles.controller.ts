import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';

@ApiTags('vehicles')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Register a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all vehicles (paged)' })
  @ApiResponse({ status: 200, description: 'Return paged vehicles' })
  findAll(
    @Query() filterVehicleDto: FilterVehicleDto,
    @GetUser() user: User
  ) {
    const { limit, offset, ...filters } = filterVehicleDto;
    const paginationQuery = { limit, offset };
    const showDeleted = user.role === UserRole.ADMIN;
    return this.vehiclesService.findAll(paginationQuery, filters, showDeleted);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Return vehicle details' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @GetUser() user: User
  ) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.vehiclesService.findOne(id, showDeleted);
  }

  @Patch(':id')
  @SkipAudit()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update vehicle details' })
  @ApiParam({ name: 'id', description: 'Vehicle MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  update(
    @Param('id', ParseMongoIdPipe) id: string, 
    @Body() updateVehicleDto: UpdateVehicleDto,
    @GetUser() user: User
  ) {
    return this.vehiclesService.update(id, updateVehicleDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a vehicle (Admin only)' })
  @ApiParam({ name: 'id', description: 'Vehicle MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}
