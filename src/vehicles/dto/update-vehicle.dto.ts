import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({ description: 'Soft delete status' })
  @IsBoolean({ message: 'validation.IS_BOOLEAN' })
  @IsOptional()
  deleted?: boolean;
}
