import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';
import { UnloadStatus } from '../enums/unloadStatus';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  // --- DRIVER ---
  @ApiPropertyOptional({
    description: 'Driver ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  driver?: string;

  @ApiPropertyOptional({
    description: 'Driver phone number (required if driver ID is missing)',
    example: '+905551234567',
  })
  @ValidateIf((o: CreateTripDto) => !o.driver)
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  driver_phone_number?: string;

  @ApiPropertyOptional({ description: 'Driver full name', example: 'John Doe' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  driver_full_name?: string;

  // --- COMPANY ---

  @ApiPropertyOptional({
    description: 'Company ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  company?: string;

  @ApiPropertyOptional({
    description: 'Company name (required if company ID is missing)',
    example: 'Example Logistics',
  })
  @ValidateIf((o: CreateTripDto) => !o.company)
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  company_name?: string;

  // --- Vehicle ---
  @ApiPropertyOptional({
    description: 'Vehicle ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  vehicle?: string;

  @ApiPropertyOptional({
    description: 'Licence plate (required if vehicle ID is missing)',
    example: '34ABC123',
  })
  @ValidateIf((o: CreateTripDto) => !o.vehicle)
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @MinLength(4, { message: 'validation.MIN_LENGTH' })
  licence_plate?: string;

  @ApiPropertyOptional({ description: 'Vehicle type', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  // --- OTHERS ---

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Departure time',
    example: '2024-03-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  departure_time?: string;

  @ApiPropertyOptional({
    description: 'Arrival time',
    example: '2024-03-20T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  arrival_time?: string;

  @ApiPropertyOptional({ description: 'Unload status', enum: UnloadStatus })
  @IsOptional()
  @IsEnum(UnloadStatus, { message: 'validation.IS_ENUM' })
  unload_status?: UnloadStatus;

  @ApiPropertyOptional({ description: 'Has GPS tracking' })
  @IsOptional()
  @IsBoolean()
  has_gps_tracking?: boolean;

  @ApiPropertyOptional({ description: 'In temporary parking lot' })
  @IsOptional()
  @IsBoolean()
  is_in_temporary_parking_lot?: boolean;

  @ApiPropertyOptional({ description: 'Is trip canceled' })
  @IsOptional()
  @IsBoolean()
  is_trip_canceled?: boolean;
}
