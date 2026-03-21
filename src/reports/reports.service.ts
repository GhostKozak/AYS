import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../trips/schema/trips.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { ReportPeriod } from './dto/report-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import * as dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';
const PDFDocument = require('pdfkit-table');

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  async getTopCompanies(period: ReportPeriod) {
    const dateQuery = this.getDateRange(period);
    
    return this.tripModel.aggregate([
      {
        $match: {
          is_trip_canceled: false,
          ...dateQuery,
        },
      },
      {
        $addFields: {
          companyId: {
            $cond: {
              if: { $eq: [{ $type: '$company' }, 'string'] },
              then: { $toObjectId: '$company' },
              else: '$company',
            },
          },
        },
      },
      {
        $group: {
          _id: '$companyId',
          tripCount: { $sum: 1 },
        },
      },
      {
        $sort: { tripCount: -1 },
      },
      { $limit: 10 },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          tripCount: 1,
          companyName: { $ifNull: ['$company.name', { $toString: '$_id' }] },
        },
      },
    ]);
  }

  async getUnloadWaitingStats(period: ReportPeriod) {
    const dateQuery = this.getDateRange(period);

    return this.tripModel.aggregate([
      {
        $match: {
          is_trip_canceled: false,
          unload_status: { $ne: 'CANCELED' },
          ...dateQuery,
        },
      },
      {
        $addFields: {
          companyId: {
            $cond: {
              if: { $eq: [{ $type: '$company' }, 'string'] },
              then: { $toObjectId: '$company' },
              else: '$company',
            },
          },
        },
      },
      {
        $group: {
          _id: '$companyId',
          waitingCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          waitingCount: 1,
          companyName: { $ifNull: ['$company.name', { $toString: '$_id' }] },
        },
      },
      { $sort: { waitingCount: -1 } },
    ]);
  }

  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    const today = this.getDateRange(ReportPeriod.TODAY);
    
    const [totalToday, waitingToday, topToday, totalCompanies, totalDrivers] = await Promise.all([
      this.tripModel.countDocuments({ is_trip_canceled: false, ...today }),
      this.tripModel.countDocuments({ 
        is_trip_canceled: false, 
        unload_status: { $ne: 'CANCELED' },
        ...today 
      }),
      this.getTopCompanies(ReportPeriod.TODAY),
      this.companyModel.countDocuments({}),
      this.driverModel.countDocuments({}),
    ]);

    return {
      today: {
        totalTrips: totalToday,
        waitingToUnload: waitingToday,
        topCompanies: topToday.slice(0, 5),
      },
      totalCompanies,
      totalDrivers,
    };
  }

  async getStatusDistribution(period: ReportPeriod) {
    const dateQuery = this.getDateRange(period);

    const [statusDistribution, parkingLotStats, canceledStats] = await Promise.all([
      this.tripModel.aggregate([
        { $match: { is_trip_canceled: false, ...dateQuery } },
        { $group: { _id: '$unload_status', count: { $sum: 1 } } }
      ]),
      this.tripModel.countDocuments({ is_trip_canceled: false, is_in_parking_lot: true, ...dateQuery }),
      this.tripModel.countDocuments({ is_trip_canceled: true, ...dateQuery }),
    ]);

    const formattedDistribution = statusDistribution.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      statuses: formattedDistribution,
      inParkingLot: parkingLotStats,
      canceled: canceledStats,
    };
  }

  async getAverageTurnaround(period: ReportPeriod) {
    const dateQuery = this.getDateRange(period);

    const result = await this.tripModel.aggregate([
      {
        $match: {
          is_trip_canceled: false,
          departure_time: { $ne: null },
          arrival_time: { $ne: null },
          ...dateQuery,
        },
      },
      {
        $project: {
          company: 1,
          durationMs: { $subtract: ['$departure_time', '$arrival_time'] },
        },
      },
      {
        $group: {
          _id: 'Average',
          averageDurationMs: { $avg: '$durationMs' },
          tripCount: { $sum: 1 },
        },
      },
    ]);

    if (!result.length) return { averageMinutes: 0, tripCount: 0 };

    return {
      averageMinutes: Math.round(result[0].averageDurationMs / (1000 * 60)),
      tripCount: result[0].tripCount,
    };
  }

  async getTrend(period: ReportPeriod) {
    const dateQuery = this.getDateRange(period);
    
    // Determine the grouping format based on the period
    let format = '%Y-%m-%d'; // Default to daily
    if (period === ReportPeriod.TODAY) {
      format = '%Y-%m-%dT%H:00:00'; // Hourly format
    } else if (period === ReportPeriod.YEAR) {
      format = '%Y-%m'; // Monthly format
    }

    return this.tripModel.aggregate([
      {
        $match: {
          is_trip_canceled: false,
          ...dateQuery,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format, date: '$arrival_time' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Chronological order
      {
        $project: {
          timestamp: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }

  async exportTripsToExcel(period: ReportPeriod, response: any): Promise<void> {
    const dateQuery = this.getDateRange(period);
    
    // Create cursor for streaming
    const cursor = this.tripModel.find({ is_trip_canceled: false, ...dateQuery })
      .select('arrival_time unload_status company driver vehicle')
      .populate('company', 'name')
      .populate('driver', 'full_name')
      .populate('vehicle', 'licence_plate')
      .sort({ arrival_time: -1 })
      .lean()
      .cursor();

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: response,
      useStyles: true,
      useSharedStrings: true
    });

    const worksheet = workbook.addWorksheet('Trips');

    // Add summary information
    const [totalCompanies, totalDrivers] = await Promise.all([
      this.companyModel.countDocuments({}),
      this.driverModel.countDocuments({}),
    ]);

    // Summary at the top
    worksheet.addRow(['Report Period', period.toUpperCase()]).commit();
    worksheet.addRow(['Total Companies', totalCompanies]).commit();
    worksheet.addRow(['Total Drivers', totalDrivers]).commit();
    worksheet.addRow([]).commit(); // Empty row

    // Manually add the header row
    worksheet.addRow(['Arrival Time', 'Company', 'Plate', 'Driver', 'Status', 'Notes']).commit();

    for (let trip = await cursor.next(); trip != null; trip = await cursor.next()) {
      worksheet.addRow([
        dayjs(trip.arrival_time).format('YYYY-MM-DD HH:mm'),
        trip.company?.name || 'N/A',
        trip.vehicle?.licence_plate || 'N/A',
        trip.driver?.full_name || 'N/A',
        trip.unload_status,
        trip.notes || '',
      ]).commit();
    }

    await workbook.commit();
  }

  async exportTripsToPdf(period: ReportPeriod, response: any): Promise<void> {
    const dateQuery = this.getDateRange(period);
    
    // Create cursor for streaming
    const cursor = this.tripModel.find({ is_trip_canceled: false, ...dateQuery })
      .select('arrival_time unload_status company driver vehicle')
      .populate('company', 'name')
      .populate('driver', 'full_name')
      .populate('vehicle', 'licence_plate')
      .sort({ arrival_time: -1 })
      .lean()
      .cursor();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(response);
    
    const fontPath = '/usr/share/fonts/TTF/DejaVuSans.ttf';
    const boldFontPath = '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf';
    
    try { doc.font(fontPath); } catch (e) {}

    doc.font(boldFontPath).text(`Trips Report - ${period.toUpperCase()}`, { align: 'center', size: 18 });
    doc.moveDown();

    const [totalCompanies, totalDrivers] = await Promise.all([
      this.companyModel.countDocuments({}),
      this.driverModel.countDocuments({}),
    ]);

    doc.font(fontPath).fontSize(12).text(`Total Companies: ${totalCompanies}`);
    doc.text(`Total Drivers: ${totalDrivers}`);
    doc.moveDown();

    const tableRows: any[] = [];
    for (let trip = await cursor.next(); trip != null; trip = await cursor.next()) {
      tableRows.push([
        dayjs(trip.arrival_time).format('DD.MM.YYYY HH:mm'),
        trip.company?.name || 'N/A',
        trip.vehicle?.licence_plate || 'N/A',
        trip.driver?.full_name || 'N/A',
        trip.unload_status
      ]);
    }

    const table = {
      title: "Trips Summary",
      headers: ["Date", "Company", "Plate", "Driver", "Status"],
      rows: tableRows,
    };

    doc.table(table, {
      prepareHeader: () => doc.font(boldFontPath).fontSize(10),
      prepareRow: (row: any, i: any) => doc.font(fontPath).fontSize(10),
    });

    doc.end();
  }

  private getDateRange(period: ReportPeriod) {
    const now = dayjs();
    let startDate: Date;

    switch (period) {
      case ReportPeriod.TODAY:
        startDate = now.startOf('day').toDate();
        break;
      case ReportPeriod.MONTH:
        startDate = now.startOf('month').toDate();
        break;
      case ReportPeriod.YEAR:
        startDate = now.startOf('year').toDate();
        break;
      case ReportPeriod.ALL:
      default:
        return {};
    }

    return {
      arrival_time: { $gte: startDate },
    };
  }
}
