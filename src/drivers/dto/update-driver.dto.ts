import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
    @ApiPropertyOptional({ description: 'Soft delete status' })
    @IsBoolean({ message: 'validation.IS_BOOLEAN' })
    @IsOptional()
    deleted?: boolean;
}
