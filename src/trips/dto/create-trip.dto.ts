import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';
import { UnloadStatus } from '../enums/unloadStatus';
import { VerificationStatus } from '../enums/verificationStatus';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsDefined({ message: 'validation.DRIVER_PHONE_NUMBER_REQUIRED' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @MaxLength(30, { message: 'validation.MAX_LENGTH' })
  driver_phone_number?: string;

  @ApiPropertyOptional({ description: 'Driver full name', example: 'John Doe' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  @MaxLength(100, { message: 'validation.MAX_LENGTH' })
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
  @IsDefined({ message: 'validation.COMPANY_NAME_REQUIRED' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @MaxLength(255, { message: 'validation.MAX_LENGTH' })
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
  @IsDefined({ message: 'validation.LICENCE_PLATE_REQUIRED' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  @MinLength(4, { message: 'validation.MIN_LENGTH' })
  @MaxLength(30, { message: 'validation.MAX_LENGTH' })
  licence_plate?: string;

  @ApiPropertyOptional({ description: 'Vehicle type', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;

  // --- OTHERS ---

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  @MaxLength(2000, { message: 'validation.MAX_LENGTH' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Departure time',
    example: '2024-03-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  departure_time?: string;

  @ApiProperty({
    description: 'Arrival time',
    example: '2024-03-20T18:00:00Z',
    required: true,
  })
  @IsDateString()
  arrival_time: string;

  @ApiPropertyOptional({ description: 'Unload status', enum: UnloadStatus })
  @IsOptional()
  @IsEnum(UnloadStatus, { message: 'validation.IS_ENUM' })
  unload_status?: UnloadStatus;

  @ApiPropertyOptional({ description: 'Has GPS tracking' })
  @IsOptional()
  @IsBoolean()
  has_gps_tracking?: boolean;

  @ApiPropertyOptional({ description: 'Is trip canceled' })
  @IsOptional()
  @IsBoolean()
  is_trip_canceled?: boolean;

  @ApiPropertyOptional({ description: 'Is in parking lot (auto-calculated from unload status)' })
  @IsOptional()
  @IsBoolean()
  is_in_parking_lot?: boolean;

  @ApiPropertyOptional({
    description: 'Parked at timestamp',
    example: '2024-03-20T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  parked_at?: string;

  @ApiPropertyOptional({ description: 'Parking area name', example: 'Murat Garaj' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  parking_area?: string;

  @ApiPropertyOptional({ description: 'Parking note', example: 'Gece gelindi, kapıda beklendi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  parking_note?: string;

  @ApiPropertyOptional({ description: 'Seal number', example: 'SEAL-ABC123' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  seal_number?: string;

  @ApiPropertyOptional({ description: 'Verification status', enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({ description: 'Soft delete flag' })
  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}
