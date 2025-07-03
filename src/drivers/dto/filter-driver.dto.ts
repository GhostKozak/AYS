import { IsOptional, IsString, IsMongoId } from 'class-validator';

export class FilterDriverDto {
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}