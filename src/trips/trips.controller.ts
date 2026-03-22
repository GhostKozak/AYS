import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterTripDto } from './dto/filter-trip.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';

@ApiTags('trips')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new logistics trip' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  create(@Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(createTripDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all trips (paged)' })
  @ApiResponse({ status: 200, description: 'Return paged trips' })
  findAll(
    @Query() filterTripDto: FilterTripDto,
    @GetUser() user: User
  ) {
    const { limit, offset, ...filters } = filterTripDto;
    const paginationQuery = { limit, offset };
    const showDeleted = user.role === UserRole.ADMIN;
    return this.tripsService.findAll(paginationQuery, filters, showDeleted);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Return trip details' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @GetUser() user: User
  ) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.tripsService.findOne(id, showDeleted);
  }

  @Patch(':id')
  @SkipAudit()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update trip details' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully' })
  update(
    @Param('id', ParseMongoIdPipe) id: string, 
    @Body() updateTripDto: UpdateTripDto,
    @GetUser() user: User
  ) {
    return this.tripsService.update(id, updateTripDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a trip (Admin only)' })
  @ApiParam({ name: 'id', description: 'Trip MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Trip deleted successfully' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.tripsService.remove(id);
  }
}
