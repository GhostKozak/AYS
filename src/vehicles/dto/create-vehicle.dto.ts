import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';

export class CreateVehicleDto {
    @IsString({ message: 'validation.IS_STRING' })
    @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
    licence_plate: string;
  
    @IsOptional()
    @IsEnum(VehicleType, { message: 'validation.IS_ENUM' })
    vehicle_type?: VehicleType;
}
