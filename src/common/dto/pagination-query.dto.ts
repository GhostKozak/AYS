import { IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 10,
  })
  @IsOptional()
  @IsPositive({ message: 'validation.IS_POSITIVE' })
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of items to skip', example: 0 })
  @IsOptional()
  @Min(0, { message: 'validation.MIN' })
  @Type(() => Number)
  offset?: number;
}
