import { IsOptional, IsString, IsEnum } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';

export class FilterVehicleDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType;

  @IsOptional()
  @IsString()
  search?: string;
}