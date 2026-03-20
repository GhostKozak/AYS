import { ApiProperty } from '@nestjs/swagger';

export class CompanyTripCountDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  tripCount: number;

  @ApiProperty()
  companyName: string;
}

export class TodaySummaryDto {
  @ApiProperty()
  totalTrips: number;

  @ApiProperty()
  waitingToUnload: number;

  @ApiProperty({ type: [CompanyTripCountDto] })
  topCompanies: CompanyTripCountDto[];
}

export class DashboardSummaryDto {
  @ApiProperty({ type: TodaySummaryDto })
  today: TodaySummaryDto;

  @ApiProperty()
  totalCompanies: number;

  @ApiProperty()
  totalDrivers: number;
}
