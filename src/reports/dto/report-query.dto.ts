import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

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
}
