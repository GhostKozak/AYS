import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({ description: 'Soft delete status' })
  @IsBoolean({ message: 'validation.IS_BOOLEAN' })
  @IsOptional()
  deleted?: boolean;
}
