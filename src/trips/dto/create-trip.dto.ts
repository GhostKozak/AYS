import { IsBoolean, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';
import { UnloadStatus } from '../enums/unloadStatus';

export class CreateTripDto {
  // --- DRIVER ---
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  driver?: string;

  @ValidateIf((o) => !o.driver)
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  driver_phone_number?: string;

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  driver_full_name?: string;

  // --- COMPANY ---

  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  company?: string;

  @ValidateIf((o) => !o.company)
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  company_name?: string;

  // --- Vehicle ---
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  vehicle?: string;

  @ValidateIf((o) => !o.vehicle)
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @MinLength(4, { message: 'validation.MIN_LENGTH' })
  licence_plate?: string;

  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  // --- OTHERS ---

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  notes?: string;

  @IsOptional()
  @IsDateString()
  departure_time?: string;

  @IsOptional()
  @IsDateString()
  arrival_time?: string;

  @IsOptional()
  @IsEnum(UnloadStatus, { message: 'validation.IS_ENUM' })
  unload_status?: UnloadStatus;

  @IsOptional()
  @IsBoolean()
  has_gps_tracking?: boolean;

  @IsOptional()
  @IsBoolean()
  is_in_temporary_parking_lot?: boolean;

  @IsOptional()
  @IsBoolean()
  is_trip_canceled?: boolean;
}