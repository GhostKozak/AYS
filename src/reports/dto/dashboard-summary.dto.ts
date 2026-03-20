import { ApiProperty } from '@nestjs/swagger';

class CompanyTripCountDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  tripCount: number;

  @ApiProperty()
  companyName: string;
}

class TodaySummaryDto {
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
