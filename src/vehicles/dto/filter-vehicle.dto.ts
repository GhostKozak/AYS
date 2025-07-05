import { IsOptional, IsString, IsEnum } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';

export class FilterVehicleDto {
  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}