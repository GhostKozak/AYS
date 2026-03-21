import { IsOptional, IsString, IsMongoId, IsPositive, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterDriverDto {
  @ApiPropertyOptional({ description: 'Number of items to return', example: 10 })
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

  @ApiPropertyOptional({ description: 'Search term for driver name or phone' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}