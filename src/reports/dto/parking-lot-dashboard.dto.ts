import { ApiProperty } from '@nestjs/swagger';

export class ParkingLotStatusBreakdownDto {
  @ApiProperty({
    description: 'Number of vehicles waiting to unload',
    example: 15,
  })
  WAITING: number;

  @ApiProperty({
    description: 'Number of vehicles currently unloading',
    example: 8,
  })
  UNLOADING: number;

  @ApiProperty({
    description: 'Number of vehicles that finished unloading',
    example: 12,
  })
  UNLOADED: number;

  @ApiProperty({
    description: 'Number of vehicles with completed trips',
    example: 5,
  })
  COMPLETED: number;

  @ApiProperty({
    description: 'Number of canceled vehicles still in parking lot',
    example: 7,
  })
  CANCELED: number;

  @ApiProperty({
    description: 'Number of vehicles with unknown status',
    example: 0,
  })
  UNKNOWN: number;
}

export class ParkingLotDashboardDto {
  @ApiProperty({
    description: 'Total parking lot capacity (optional)',
    example: 100,
    nullable: true,
  })
  totalCapacity?: number;

  @ApiProperty({
    description: 'Current total count of vehicles in parking lot',
    example: 42,
  })
  currentCount: number;

  @ApiProperty({
    description: 'Breakdown of vehicles by unload status',
    type: ParkingLotStatusBreakdownDto,
  })
  breakdown: ParkingLotStatusBreakdownDto;

  @ApiProperty({
    description: 'Parking lot occupancy percentage',
    example: 42,
    nullable: true,
  })
  occupancyPercentage?: number;
}
