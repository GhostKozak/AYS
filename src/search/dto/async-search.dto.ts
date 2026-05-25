import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnloadStatus } from '../../trips/enums/unloadStatus';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';

export enum SearchModuleEnum {
  COMPANIES = 'companies',
  DRIVERS = 'drivers',
  TRIPS = 'trips',
  VEHICLES = 'vehicles',
}

export class AsyncSearchDto {
  @ApiProperty({ description: 'Module to search in', enum: SearchModuleEnum })
  @IsEnum(SearchModuleEnum)
  module: SearchModuleEnum;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Number of items to return', default: 20, minimum: 1 })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0, minimum: 0 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Filter by company ID (drivers, trips)' })
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by driver ID (trips)' })
  @IsOptional()
  @IsMongoId()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Filter by vehicle ID (trips)' })
  @IsOptional()
  @IsMongoId()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filter by field verification status (trips)', enum: ['PENDING', 'CONFIRMED', 'CANCELED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by unload status (trips)', enum: UnloadStatus })
  @IsOptional()
  @IsEnum(UnloadStatus)
  unload_status?: UnloadStatus;

  @ApiPropertyOptional({ description: 'Filter by vehicle type (vehicles)', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType;
}
