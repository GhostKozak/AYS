import { IsOptional, IsString, IsEnum } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterVehicleDto {
  @ApiPropertyOptional({ description: 'Filter by vehicle type', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  @ApiPropertyOptional({ description: 'Search term for licence plate' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}