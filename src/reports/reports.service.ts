import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../trips/schema/trips.schema';
import { ReportPeriod } from './dto/report-query.dto';
import * as dayjs from 'dayjs';

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
