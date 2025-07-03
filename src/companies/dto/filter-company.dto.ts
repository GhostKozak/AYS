import { IsOptional, IsString } from 'class-validator';

export class FilterCompanyDto {
  @IsOptional()
  @IsString()
  search?: string;
}