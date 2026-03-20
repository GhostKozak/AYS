import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ReportsService } from './reports.service';
import { ReportQueryDto, ReportPeriod } from './dto/report-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Return top companies list' })
  getTopCompanies(@Query() query: ReportQueryDto) {
    return this.reportsService.getTopCompanies(query.period || ReportPeriod.MONTH);
  }

  @Get('unload-waiting')
  @ApiOperation({ summary: 'Get stats of vehicles waiting to unload' })
  @ApiResponse({ status: 200, description: 'Return waiting stats by company' })
  getUnloadWaiting(@Query() query: ReportQueryDto) {
    return this.reportsService.getUnloadWaitingStats(query.period || ReportPeriod.MONTH);
  }

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get general dashboard summary for today' })
  @ApiResponse({ status: 200, description: 'Return summary object', type: DashboardSummaryDto })
  getSummary() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('status-distribution')
  @ApiOperation({ summary: 'Get distribution of trip statuses and parking lot occupancy' })
  @ApiResponse({ status: 200, description: 'Return status counts' })
  getStatusDistribution(@Query() query: ReportQueryDto) {
    return this.reportsService.getStatusDistribution(query.period || ReportPeriod.MONTH);
  }

  @Get('average-turnaround')
  @ApiOperation({ summary: 'Get average turnaround time (arrival to departure) in minutes' })
  @ApiResponse({ status: 200, description: 'Return average turnaround time' })
  getAverageTurnaround(@Query() query: ReportQueryDto) {
    return this.reportsService.getAverageTurnaround(query.period || ReportPeriod.MONTH);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get time-series trend of trips' })
  @ApiResponse({ status: 200, description: 'Return chronological trip counts' })
  getTrend(@Query() query: ReportQueryDto) {
    return this.reportsService.getTrend(query.period || ReportPeriod.MONTH);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export trips to Excel' })
  async exportExcel(@Query() query: ReportQueryDto, @Res() res: Response) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=trips-report.xlsx',
    });
    await this.reportsService.exportTripsToExcel(query.period || ReportPeriod.MONTH, res);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export trips to PDF' })
  async exportPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=trips-report.pdf',
    });
    await this.reportsService.exportTripsToPdf(query.period || ReportPeriod.MONTH, res);
  }
}
