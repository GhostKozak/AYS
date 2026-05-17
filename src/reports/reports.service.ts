/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, FilterQuery } from 'mongoose';
import { Trip, TripDocument } from '../trips/schema/trips.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { ReportPeriod } from './dto/report-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import dayjs = require('dayjs');
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  async getTopCompanies(
    period: ReportPeriod,
    limit: number = 10,
    sortBy: string = 'tripCount',
  ) {
    const dateQuery = this.getDateRange(period);

    const sortStage: Record<string, 1 | -1> = {};
    if (sortBy === 'revenue') {
      sortStage.totalRevenue = -1;
    } else if (sortBy === 'avgTurnaround') {
      sortStage.avgTurnaroundMs = -1;
    } else {
      sortStage.tripCount = -1;
    }

    const pipeline: PipelineStage[] = [
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
          totalRevenue: { $sum: 0 }, // Placeholder for future revenue field
          avgTurnaroundMs: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$departure_time', null] },
                    { $ne: ['$arrival_time', null] },
                  ],
                },
                { $subtract: ['$departure_time', '$arrival_time'] },
                null,
              ],
            },
          },
        },
      },
      {
        $sort: sortStage,
      },
      { $limit: limit },
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
          avgTurnaroundMinutes: {
            $round: [{ $divide: ['$avgTurnaroundMs', 1000 * 60] }, 2],
          },
        },
      },
    ];

    return this.tripModel.aggregate(pipeline);
  }

  async getUnloadWaitingStats(
    period: ReportPeriod,
    groupBy: string = 'company',
  ) {
    const dateQuery = this.getDateRange(period);

    const groupField =
      groupBy === 'driver'
        ? '$driver'
        : groupBy === 'vehicle'
          ? '$vehicle'
          : '$company';
    const collectionName =
      groupBy === 'driver'
        ? 'drivers'
        : groupBy === 'vehicle'
          ? 'vehicles'
          : 'companies';
    const nameField =
      groupBy === 'driver'
        ? 'full_name'
        : groupBy === 'vehicle'
          ? 'licence_plate'
          : 'name';

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
          entityId: {
            $cond: {
              if: { $eq: [{ $type: groupField }, 'string'] },
              then: { $toObjectId: groupField },
              else: groupField,
            },
          },
        },
      },
      {
        $group: {
          _id: '$entityId',
          waitingCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: collectionName,
          localField: '_id',
          foreignField: '_id',
          as: 'entity',
        },
      },
      { $unwind: { path: '$entity', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          waitingCount: 1,
          entityName: {
            $ifNull: [`$entity.${nameField}`, { $toString: '$_id' }],
          },
        },
      },
      { $sort: { waitingCount: -1 } },
    ]);
  }

  async getDashboardSummary(
    period: ReportPeriod = ReportPeriod.TODAY,
  ): Promise<DashboardSummaryDto> {
    const dateQuery = this.getDateRange(period);

    const [totalTrips, waitingAll, topCompanies, totalCompanies, totalDrivers] =
      await Promise.all([
        this.tripModel.countDocuments({
          is_trip_canceled: false,
          ...dateQuery,
        }),
        this.tripModel.countDocuments({
          is_trip_canceled: false,
          unload_status: { $nin: ['UNLOADED', 'CANCELED', 'COMPLETED'] },
          ...dateQuery,
        }),
        this.getTopCompanies(period, 5),
        this.companyModel.countDocuments({}),
        this.driverModel.countDocuments({}),
      ]);

    return {
      today: {
        totalTrips,
        waitingToUnload: waitingAll,
        topCompanies: topCompanies.slice(0, 5),
      },
      totalCompanies,
      totalDrivers,
    };
  }

  async getStatusDistribution(
    period: ReportPeriod,
    excludeStatus?: string | string[],
  ) {
    const dateQuery = this.getDateRange(period);
    const excludeQuery: FilterQuery<TripDocument> = {};
    if (excludeStatus) {
      excludeQuery.unload_status = {
        $nin: Array.isArray(excludeStatus) ? excludeStatus : [excludeStatus],
      };
    }

    const [statusDistribution, parkingLotStats, canceledStats] =
      await Promise.all([
        this.tripModel.aggregate([
          {
            $match: { is_trip_canceled: false, ...dateQuery, ...excludeQuery },
          },
          { $group: { _id: '$unload_status', count: { $sum: 1 } } },
        ]),
        this.tripModel.countDocuments({
          is_trip_canceled: false,
          is_in_parking_lot: true,
          ...dateQuery,
          ...excludeQuery,
        }),
        this.tripModel.countDocuments({
          is_trip_canceled: true,
          ...dateQuery,
          ...excludeQuery,
        }),
      ]);

    const formattedDistribution = statusDistribution.reduce<
      Record<string, number>
    >((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      statuses: formattedDistribution,
      inParkingLot: parkingLotStats,
      canceled: canceledStats,
    };
  }

  async getAverageTurnaround(period: ReportPeriod, companyId?: string) {
    const dateQuery = this.getDateRange(period);
    const matchQuery: FilterQuery<TripDocument> = {
      is_trip_canceled: false,
      departure_time: { $ne: null },
      arrival_time: { $ne: null },
      ...dateQuery,
    };

    if (companyId) {
      matchQuery.company = companyId;
    }

    const result = await this.tripModel.aggregate([
      {
        $match: matchQuery,
      },
      {
        $project: {
          company: 1,
          durationMs: { $subtract: ['$departure_time', '$arrival_time'] },
        },
      },
      {
        $group: {
          _id: companyId ? '$company' : 'Average',
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

  async getTrend(period: ReportPeriod, year?: number, companyId?: string) {
    const dateQuery = this.getDateRange(period, year);
    const matchQuery: FilterQuery<TripDocument> = {
      is_trip_canceled: false,
      ...dateQuery,
    };

    if (companyId) {
      matchQuery.company = companyId;
    }

    // Determine the grouping format based on the period
    let format = '%Y-%m-%d'; // Default to daily
    if (period === ReportPeriod.TODAY) {
      format = '%Y-%m-%dT%H:00:00'; // Hourly format
    } else if (period === ReportPeriod.YEAR) {
      format = '%Y-%m'; // Monthly format
    }

    return this.tripModel.aggregate([
      {
        $match: matchQuery,
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

  async exportTripsToExcel(
    period: ReportPeriod,
    response: any,
    excludeStatus?: string | string[],
  ): Promise<void> {
    const dateQuery = this.getDateRange(period);
    const excludeQuery: FilterQuery<TripDocument> = {};
    if (excludeStatus) {
      excludeQuery.unload_status = {
        $nin: Array.isArray(excludeStatus) ? excludeStatus : [excludeStatus],
      };
    }

    // Create cursor for streaming
    const cursor = this.tripModel
      .find({ is_trip_canceled: false, ...dateQuery, ...excludeQuery })
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
      useSharedStrings: true,
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
    worksheet
      .addRow(['Arrival Time', 'Company', 'Plate', 'Driver', 'Status', 'Notes'])
      .commit();

    for (
      let trip = await cursor.next();
      trip != null;
      trip = await cursor.next()
    ) {
      worksheet
        .addRow([
          dayjs(trip.arrival_time).format('YYYY-MM-DD HH:mm'),
          trip.company?.name || 'N/A',
          trip.vehicle?.licence_plate || 'N/A',
          trip.driver?.full_name || 'N/A',
          trip.unload_status,
          trip.notes || '',
        ])
        .commit();
    }

    await workbook.commit();
  }

  async exportTripsToPdf(
    period: ReportPeriod,
    response: any,
    excludeStatus?: string | string[],
  ): Promise<void> {
    const dateQuery = this.getDateRange(period);
    const excludeQuery: FilterQuery<TripDocument> = {};
    if (excludeStatus) {
      excludeQuery.unload_status = {
        $nin: Array.isArray(excludeStatus) ? excludeStatus : [excludeStatus],
      };
    }

    // Create cursor for streaming
    const cursor = this.tripModel
      .find({ is_trip_canceled: false, ...dateQuery, ...excludeQuery })
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

    try {
      doc.font(fontPath);
    } catch {
      /* ignore */
    }

    try {
      doc
        .font(boldFontPath)
        .fontSize(18)
        .text(`Trips Report - ${period.toUpperCase()}`, {
          align: 'center',
        });
    } catch {
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(`Trips Report - ${period.toUpperCase()}`, {
          align: 'center',
        });
    }
    doc.moveDown();

    const [totalCompanies, totalDrivers] = await Promise.all([
      this.companyModel.countDocuments({}),
      this.driverModel.countDocuments({}),
    ]);

    try {
      doc
        .font(fontPath)
        .fontSize(12)
        .text(`Total Companies: ${totalCompanies}`);
      doc.text(`Total Drivers: ${totalDrivers}`);
    } catch {
      doc
        .font('Helvetica')
        .fontSize(12)
        .text(`Total Companies: ${totalCompanies}`);
      doc.text(`Total Drivers: ${totalDrivers}`);
    }
    doc.moveDown();

    const tableRows: string[][] = [];
    for (
      let trip = await cursor.next();
      trip != null;
      trip = await cursor.next()
    ) {
      tableRows.push([
        dayjs(trip.arrival_time).format('DD.MM.YYYY HH:mm'),
        trip.company?.name || 'N/A',
        trip.vehicle?.licence_plate || 'N/A',
        trip.driver?.full_name || 'N/A',
        trip.unload_status,
      ]);
    }

    const table = {
      title: 'Trips Summary',
      headers: ['Date', 'Company', 'Plate', 'Driver', 'Status'],
      rows: tableRows,
    };

    await doc.table(table, {
      prepareHeader: () => {
        try {
          return doc.font(boldFontPath).fontSize(10);
        } catch {
          return doc.font('Helvetica-Bold').fontSize(10);
        }
      },
      prepareRow: () => {
        try {
          return doc.font(fontPath).fontSize(10);
        } catch {
          return doc.font('Helvetica').fontSize(10);
        }
      },
    });

    doc.end();
  }

  async getParkingLotDashboard(totalCapacity?: number) {
    // Get total count of vehicles in parking lot
    const currentCount = await this.tripModel.countDocuments({
      is_in_parking_lot: true,
    });

    // Get breakdown by unload status
    const statusBreakdown = await this.tripModel.aggregate([
      {
        $match: {
          is_in_parking_lot: true,
        },
      },
      {
        $group: {
          _id: '$unload_status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format the breakdown
    const breakdown = {
      WAITING: 0,
      UNLOADING: 0,
      UNLOADED: 0,
      COMPLETED: 0,
      CANCELED: 0,
      UNKNOWN: 0,
    };

    statusBreakdown.forEach((item) => {
      if (item._id in breakdown) {
        breakdown[item._id] = item.count;
      }
    });

    // Calculate occupancy percentage if capacity is provided
    const occupancyPercentage = totalCapacity
      ? Math.round((currentCount / totalCapacity) * 100)
      : undefined;

    return {
      totalCapacity,
      currentCount,
      breakdown,
      occupancyPercentage,
    };
  }

  private getDateRange(period: ReportPeriod, year?: number) {
    const now = dayjs();
    let startDate: dayjs.Dayjs;
    let endDate: dayjs.Dayjs | undefined;

    switch (period) {
      case ReportPeriod.TODAY:
        startDate = now.startOf('day');
        endDate = now.endOf('day');
        break;
      case ReportPeriod.MONTH:
        startDate = now.startOf('month');
        endDate = now.endOf('month');
        break;
      case ReportPeriod.YEAR:
        if (year && Number.isInteger(year) && year > 0) {
          startDate = dayjs().year(year).startOf('year');
          endDate = dayjs().year(year).endOf('year');
        } else {
          startDate = now.startOf('year');
          endDate = now.endOf('year');
        }
        break;
      case ReportPeriod.ALL:
      default:
        return {};
    }

    const range: Record<string, Date> = { $gte: startDate.toDate() };
    if (endDate) {
      range.$lte = endDate.toDate();
    }

    return {
      arrival_time: range,
    };
  }
}
