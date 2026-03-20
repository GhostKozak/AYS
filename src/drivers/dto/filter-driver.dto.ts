import { IsOptional, IsString, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterDriverDto {
  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  companyId?: string;

  @ApiPropertyOptional({ description: 'Search term for driver name or phone' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}