import { IsOptional, IsString, IsPositive, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterCompanyDto {
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

  @ApiPropertyOptional({ description: 'Search term for company name' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}