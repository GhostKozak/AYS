import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCompanyDto {
  @ApiPropertyOptional({ description: 'Search term for company name' })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}