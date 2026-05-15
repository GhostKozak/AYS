import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Licence plate number', example: '34ABC123' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  licence_plate: string;

  @ApiPropertyOptional({
    description: 'Vehicle type',
    enum: VehicleType,
    default: VehicleType.TRUCK,
  })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
  vehicle_type?: VehicleType;
}
