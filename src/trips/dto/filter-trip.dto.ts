import {
  IsOptional,
  IsString,
  IsMongoId,
  IsEnum,
  IsPositive,
  Min,
} from 'class-validator';
import { UnloadStatus } from '../enums/unloadStatus';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterTripDto {
  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 10,
  })
  @IsOptional()
  @IsPositive({ message: 'validation.IS_POSITIVE' })
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', example: 0 })
  @IsOptional()
  @Min(0, { message: 'validation.MIN' })
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by driver ID' })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  driverId?: string;

  @ApiPropertyOptional({ description: 'Filter by vehicle ID' })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by unload status',
    enum: UnloadStatus,
  })
  @IsOptional()
  @IsEnum(UnloadStatus, { message: 'validation.IS_ENUM' })
  unload_status?: UnloadStatus;

  @ApiPropertyOptional({
    description: 'Search term for notes, driver, company, or plate',
  })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}
