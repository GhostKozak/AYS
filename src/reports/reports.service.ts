import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../trips/schema/trips.schema';
import { ReportPeriod } from './dto/report-query.dto';
import * as dayjs from 'dayjs';
import * as ExcelJS from 'exceljs';
const PDFDocument = require('pdfkit-table');

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
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
        $group: {
          _id: '$company',
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
      { $unwind: '$company' },
      {
        $project: {
          _id: 1,
          tripCount: 1,
          companyName: '$company.name',
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
          unload_status: { $ne: 'UNLOADED' }, // Assuming 'UNLOADED' is the string value
          ...dateQuery,
        },
      },
      {
        $group: {
          _id: '$company',
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
      { $unwind: '$company' },
      {
        $project: {
          _id: 1,
          waitingCount: 1,
          companyName: '$company.name',
        },
      },
      { $sort: { waitingCount: -1 } },
    ]);
  }

  async getDashboardSummary() {
    const today = this.getDateRange(ReportPeriod.TODAY);
    
    const [totalToday, waitingToday, topToday] = await Promise.all([
      this.tripModel.countDocuments({ is_trip_canceled: false, ...today }),
      this.tripModel.countDocuments({ 
        is_trip_canceled: false, 
        unload_status: { $ne: 'UNLOADED' },
        ...today 
      }),
      this.getTopCompanies(ReportPeriod.TODAY),
    ]);

    return {
      today: {
        totalTrips: totalToday,
        waitingToUnload: waitingToday,
        topCompanies: topToday.slice(0, 5),
      },
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

  async exportTripsToExcel(period: ReportPeriod): Promise<Buffer> {
    const dateQuery = this.getDateRange(period);
    const trips = await this.tripModel.find({ is_trip_canceled: false, ...dateQuery })
      .populate('company')
      .populate('driver')
      .populate('vehicle')
      .sort({ arrival_time: -1 })
      .exec();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Trips');

    worksheet.columns = [
      { header: 'Arrival Time', key: 'arrival', width: 20 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Plate', key: 'plate', width: 15 },
      { header: 'Driver', key: 'driver', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    trips.forEach(trip => {
      worksheet.addRow({
        arrival: dayjs(trip.arrival_time).format('YYYY-MM-DD HH:mm'),
        company: trip.company?.name || 'N/A',
        plate: trip.vehicle?.licence_plate || 'N/A',
        driver: trip.driver?.full_name || 'N/A',
        status: trip.unload_status,
        notes: trip.notes || '',
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async exportTripsToPdf(period: ReportPeriod): Promise<Buffer> {
    const dateQuery = this.getDateRange(period);
    const trips = await this.tripModel.find({ is_trip_canceled: false, ...dateQuery })
      .populate('company')
      .populate('driver')
      .populate('vehicle')
      .sort({ arrival_time: -1 })
      .exec();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Support for Turkish characters (ğ, ü, ş, İ, ö, ç)
    const fontPath = '/usr/share/fonts/TTF/DejaVuSans.ttf';
    const boldFontPath = '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf';
    
    try {
      doc.font(fontPath);
    } catch (e) {
      // Fallback if font is not found in the exact path
    }

    const buffers: any[] = [];
    doc.on('data', buffers.push.bind(buffers));

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.font(boldFontPath).text(`Trips Report - ${period.toUpperCase()}`, { align: 'center', size: 18 });
      doc.moveDown();

      const table = {
        title: "Trips Summary",
        headers: ["Date", "Company", "Plate", "Driver", "Status"],
        rows: trips.map(trip => [
          dayjs(trip.arrival_time).format('DD.MM.YYYY HH:mm'),
          trip.company?.name || 'N/A',
          trip.vehicle?.licence_plate || 'N/A',
          trip.driver?.full_name || 'N/A',
          trip.unload_status
        ]),
      };

      doc.table(table, {
        prepareHeader: () => doc.font(boldFontPath).fontSize(10),
        prepareRow: (row: any, i: any) => doc.font(fontPath).fontSize(10),
      });

      doc.end();
    });
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
