import { IsOptional, IsString, IsMongoId } from 'class-validator';

export class FilterDriverDto {
  @IsOptional()
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  companyId?: string;

  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  search?: string;
}