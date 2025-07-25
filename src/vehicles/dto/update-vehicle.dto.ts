import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
    @IsBoolean({ message: 'validation.IS_BOOLEAN' })
    @IsOptional()
    deleted?: boolean;
}
