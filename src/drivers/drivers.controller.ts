import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterDriverDto } from './dto/filter-driver.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';

@ApiTags('drivers')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
@ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('by-phone/:phone')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Find a driver by phone number' })
  @ApiParam({ name: 'phone', description: 'Driver phone number' })
  @ApiResponse({ status: 200, description: 'Return driver details' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  findDriverByPhone(@Param('phone') phone: string) {
    return this.driversService.findByPhone(phone);
  }

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Search drivers by name or phone' })
  @ApiQuery({ name: 'query', description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Return matching drivers' })
  findDriverByNameOrPhone(@Query('query') query: string) {
    return this.driversService.findDriverByNameOrPhone(query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new driver' })
  @ApiResponse({ status: 201, description: 'Driver created successfully' })
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all drivers (paged)' })
  @ApiResponse({ status: 200, description: 'Return paged drivers' })
  findAll(
    @Query() filterDriverDto: FilterDriverDto,
    @GetUser() user: User
  ) {
    const { limit, offset, ...filters } = filterDriverDto;
    const paginationQuery = { limit, offset };
    const showDeleted = user.role === UserRole.ADMIN;
    return this.driversService.findAll(paginationQuery, filters, showDeleted);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiParam({ name: 'id', description: 'Driver MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Return driver details' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @GetUser() user: User
  ) {
    const showDeleted = user.role === UserRole.ADMIN;
    return this.driversService.findOne(id, showDeleted);
  }

  @Patch(':id')
  @SkipAudit()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update driver details' })
  @ApiParam({ name: 'id', description: 'Driver MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Driver updated successfully' })
  update(
    @Param('id', ParseMongoIdPipe) id: string, 
    @Body() updateDriverDto: UpdateDriverDto,
    @GetUser() user: User
  ) {
    return this.driversService.update(id, updateDriverDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a driver (Admin only)' })
  @ApiParam({ name: 'id', description: 'Driver MongoDB ID' })
  @ApiResponse({ status: 200, description: 'Driver deleted successfully' })
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.driversService.remove(id);
  }
}
