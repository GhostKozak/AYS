import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterVehicleDto {
  @ApiPropertyOptional({ description: 'Filter by vehicle type', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  @ApiPropertyOptional({ description: 'Search term for licence plate' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;

  @ApiPropertyOptional({ description: 'Number of items to return', minimum: 1, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'validation.IS_NUMBER' })
  @Min(1, { message: 'validation.MIN' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'validation.IS_NUMBER' })
  @Min(0, { message: 'validation.MIN' })
  offset?: number;
}