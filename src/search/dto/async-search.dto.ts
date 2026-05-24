import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnloadStatus } from '../../trips/enums/unloadStatus';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';

export enum SearchModuleEnum {
  COMPANIES = 'companies',
  DRIVERS = 'drivers',
  TRIPS = 'trips',
  VEHICLES = 'vehicles',
}

export class AsyncSearchDto {
  @IsEnum(SearchModuleEnum)
  module: SearchModuleEnum;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  // Module-specific optional filters
  @IsOptional()
  @IsMongoId()
  companyId?: string; // drivers, trips

  @IsOptional()
  @IsMongoId()
  driverId?: string; // trips

  @IsOptional()
  @IsMongoId()
  vehicleId?: string; // trips

  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELED'])
  status?: string; // trips

  @IsOptional()
  @IsEnum(UnloadStatus)
  unload_status?: UnloadStatus; // trips

  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType; // vehicles
}
