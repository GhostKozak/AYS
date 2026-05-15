import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ReportsService } from './reports.service';
import { ReportQueryDto, ReportPeriod } from './dto/report-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { ParkingLotDashboardDto } from './dto/parking-lot-dashboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Res } from '@nestjs/common';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EDITOR)
@UseInterceptors(CacheInterceptor)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('top-companies')
  @ApiOperation({ summary: 'Get top companies with most trips' })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of top companies to return (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    enum: ['tripCount', 'revenue', 'avgTurnaround'],
    required: false,
    description: 'Sort criteria (default: tripCount)',
  })
  @ApiResponse({ status: 200, description: 'Return top companies list' })
  getTopCompanies(
    @Query() query: ReportQueryDto,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.reportsService.getTopCompanies(
      query.period || ReportPeriod.MONTH,
      limit,
      sortBy,
    );
  }

  @Get('unload-waiting')
  @ApiOperation({ summary: 'Get stats of vehicles waiting to unload' })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'groupBy',
    enum: ['company', 'vehicle', 'driver'],
    required: false,
    description: 'Group results by entity (default: company)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return waiting stats grouped by entity',
  })
  getUnloadWaiting(
    @Query() query: ReportQueryDto,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportsService.getUnloadWaitingStats(
      query.period || ReportPeriod.MONTH,
      groupBy,
    );
  }

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get general dashboard summary' })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return summary object',
    type: DashboardSummaryDto,
  })
  getSummary(@Query() query: ReportQueryDto): Promise<DashboardSummaryDto> {
    return this.reportsService.getDashboardSummary(
      query.period || ReportPeriod.TODAY,
    );
  }

  @Get('parking-lot-dashboard')
  @ApiOperation({
    summary: 'Get parking lot vehicle status breakdown for dashboard widget',
  })
  @ApiQuery({
    name: 'totalCapacity',
    type: Number,
    required: false,
    description:
      'Total parking lot capacity (optional, for occupancy percentage)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return parking lot dashboard data',
    type: ParkingLotDashboardDto,
  })
  getParkingLotDashboard(
    @Query('totalCapacity') totalCapacity?: number,
  ): Promise<ParkingLotDashboardDto> {
    return this.reportsService.getParkingLotDashboard(totalCapacity);
  }

  @Get('status-distribution')
  @ApiOperation({
    summary: 'Get distribution of trip statuses and parking lot occupancy',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'excludeStatus',
    type: String,
    required: false,
    description: 'Exclude specific status from results',
  })
  @ApiResponse({ status: 200, description: 'Return status counts' })
  getStatusDistribution(@Query() query: ReportQueryDto) {
    return this.reportsService.getStatusDistribution(
      query.period || ReportPeriod.MONTH,
      query.excludeStatus,
    );
  }

  @Get('average-turnaround')
  @ApiOperation({
    summary: 'Get average turnaround time (arrival to departure) in minutes',
  })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'companyId',
    type: String,
    required: false,
    description: 'Filter by specific company ID',
  })
  @ApiResponse({ status: 200, description: 'Return average turnaround time' })
  getAverageTurnaround(
    @Query() query: ReportQueryDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getAverageTurnaround(
      query.period || ReportPeriod.MONTH,
      companyId,
    );
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get time-series trend of trips' })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description: 'Specific year to query when period=YEAR',
  })
  @ApiQuery({
    name: 'companyId',
    type: String,
    required: false,
    description: 'Filter by specific company ID',
  })
  @ApiResponse({ status: 200, description: 'Return chronological trip counts' })
  getTrend(
    @Query() query: ReportQueryDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.reportsService.getTrend(
      query.period || ReportPeriod.MONTH,
      query.year,
      companyId,
    );
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export trips to Excel' })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'excludeStatus',
    type: String,
    required: false,
    description: 'Exclude specific status (can be used multiple times)',
  })
  async exportExcel(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
    @Query('excludeStatus') excludeStatus?: string,
  ) {
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=trips-report.xlsx',
    });
    await this.reportsService.exportTripsToExcel(
      query.period || ReportPeriod.MONTH,
      res,
      excludeStatus,
    );
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export trips to PDF' })
  @ApiQuery({
    name: 'period',
    enum: ReportPeriod,
    required: false,
    description: 'Report period (TODAY, MONTH, YEAR, ALL)',
  })
  @ApiQuery({
    name: 'excludeStatus',
    type: String,
    required: false,
    description: 'Exclude specific status (can be used multiple times)',
  })
  async exportPdf(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
    @Query('excludeStatus') excludeStatus?: string,
  ) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=trips-report.pdf',
    });
    await this.reportsService.exportTripsToPdf(
      query.period || ReportPeriod.MONTH,
      res,
      excludeStatus,
    );
  }
}
