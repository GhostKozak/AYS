/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SkipAudit } from '../audit/decorators/skip-audit.decorator';
import { GetUser, AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ParseMongoIdPipe } from '../pipes/parse-mongo-id.pipe';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedController } from '../common/decorators/authenticated-controller.decorator';

@ApiTags('vehicles')
@AuthenticatedController()
@Throttle({ default: { limit: 150, ttl: 60000 } })
@Controller('vehicles')
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
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip' })
  @ApiQuery({ name: 'vehicle_type', required: false, description: 'Filter by vehicle type', enum: ['TRUCK', 'LORRY', 'VAN', 'TRAILER'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for licence plate' })
  @ApiResponse({ status: 200, description: 'Return paged vehicles' })
  findAll(@Query() filterVehicleDto: FilterVehicleDto, @GetUser() user: AuthenticatedUser) {
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
  findOne(@Param('id', ParseMongoIdPipe) id: string, @GetUser() user: AuthenticatedUser) {
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
    @GetUser() user: AuthenticatedUser,
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
