import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';

export class CreateTripDto {
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  driver_phone_number: string;

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  driver_full_name?: string;

  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  company_name: string;

  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @MinLength(4, { message: 'validation.MIN_LENGTH' })
  licence_plate: string;

  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  notes?: string;
}