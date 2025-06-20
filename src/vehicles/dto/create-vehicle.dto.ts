import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../enums/vehicleTypes';

export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    licence_plate: string;
  
    @IsOptional()
    @IsEnum(VehicleType)
    vehicle_type?: VehicleType;
}
