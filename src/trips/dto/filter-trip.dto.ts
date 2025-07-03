import { IsOptional, IsString, IsMongoId, IsEnum } from 'class-validator';
import { UnloadStatus } from '../enums/unloadStatus';

export class FilterTripDto {
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @IsOptional()
  @IsMongoId()
  driverId?: string;

  @IsOptional()
  @IsMongoId()
  vehicleId?: string;

  @IsOptional()
  @IsEnum(UnloadStatus)
  unload_status?: UnloadStatus;

  @IsOptional()
  @IsString()
  search?: string;
}