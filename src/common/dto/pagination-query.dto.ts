import { IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive({ message: 'validation.IS_POSITIVE' })
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Min(0, { message: 'validation.MIN' })
  @Type(() => Number)
  offset?: number;
}