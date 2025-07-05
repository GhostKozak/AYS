import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
    @IsBoolean({ message: 'validation.IS_BOOLEAN' })
    @IsOptional()
    deleted?: boolean;
}
