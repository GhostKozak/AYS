import { IsOptional, IsString, IsMongoId, IsEnum } from 'class-validator';
import { UnloadStatus } from '../enums/unloadStatus';

export class FilterTripDto {
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  companyId?: string;

  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  driverId?: string;

  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  vehicleId?: string;

  @IsOptional()
  @IsEnum(UnloadStatus, { message: 'validation.IS_ENUM' })
  unload_status?: UnloadStatus;

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}