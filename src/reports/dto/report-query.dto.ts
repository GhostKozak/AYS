import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportPeriod {
  TODAY = 'today',
  MONTH = 'month',
  YEAR = 'year',
  ALL = 'all',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, default: ReportPeriod.MONTH })
  @IsEnum(ReportPeriod)
  @IsOptional()
  period?: ReportPeriod = ReportPeriod.MONTH;

  @ApiPropertyOptional({ type: Number, description: 'Year for period=YEAR' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year?: number;

  @ApiPropertyOptional({ type: [String], description: 'Statuses to exclude' })
  @IsOptional()
  excludeStatus?: string | string[];
}
