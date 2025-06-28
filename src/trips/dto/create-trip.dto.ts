import { IsBoolean, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
  import { UnloadStatus } from '../enums/unloadStatus';
  import { VehicleType } from '../../vehicles/enums/vehicleTypes';
  
  export class CreateTripDto {
    @IsMongoId({ message: 'Geçerli bir şoför IDsi girilmelidir.' })
    @IsNotEmpty()
    driver: string;
  
    @IsMongoId({ message: 'Geçerli bir şirket IDsi girilmelidir.' })
    @IsNotEmpty()
    company: string;
  
    @IsString()
    @IsNotEmpty()
    @MinLength(4)
    licence_plate: string;
  
    @IsOptional()
    @IsEnum(VehicleType)
    vehicle_type?: VehicleType;
  
    @IsOptional()
    @IsEnum(UnloadStatus)
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
  
    @IsOptional()
    @IsString()
    notes?: string;
  }  