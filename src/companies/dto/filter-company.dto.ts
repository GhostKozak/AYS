import { IsOptional, IsString } from 'class-validator';

export class FilterCompanyDto {
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}