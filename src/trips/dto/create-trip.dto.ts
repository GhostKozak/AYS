import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  driver_phone_number: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  driver_full_name?: string;

  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  licence_plate: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType;

  @IsOptional()
  @IsString()
  notes?: string;
}