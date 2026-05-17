/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip } from '../../trips/schema/trips.schema';
import { UnloadStatus } from '../../trips/enums/unloadStatus';

@Injectable()
export class TripSeeder {
  private readonly logger = new Logger(TripSeeder.name);

  constructor(
    @InjectModel(Trip.name) private tripModel: Model<Trip>,
  ) {}

  async clear() {
    await this.tripModel.deleteMany({});
  }

  async seed(companies: any[], drivers: any[], vehicles: any[]): Promise<void> {
    const trips: any[] = [];
    const now = new Date();

    // 2025 yılı için aylık dağılım
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2025, month + 1, 0).getDate();

      for (
        let day = 1;
        day <= daysInMonth;
        day += Math.floor(Math.random() * 3) + 1
      ) {
        const tripDate = new Date(2025, month, day);
        const dailyTrips = Math.floor(Math.random() * 21) + 10;

        for (let i = 0; i < dailyTrips; i++) {
          const entry = this.buildTripEntry(
            tripDate,
            now,
            companies,
            drivers,
            vehicles,
          );
          if (entry) trips.push(entry);
        }
      }
    }

    // Bugün ve dün için ek seferler
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const targetDate = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      for (let i = 0; i < 20; i++) {
        const entry = this.buildRecentTripEntry(targetDate, dayOffset, companies, drivers, vehicles);
        if (entry) trips.push(entry);
      }
    }

    for (const tripData of trips) {
      await this.tripModel.create(tripData);
    }
    this.logger.log(`Trips seeded: ${trips.length}`);
  }

  private buildTripEntry(
    tripDate: Date,
    now: Date,
    companies: any[],
    drivers: any[],
    vehicles: any[],
  ): any | null {
    const activeDrivers = drivers.filter((d) => !d.deleted);
    const activeVehicles = vehicles.filter((v) => !v.deleted);
    if (!activeDrivers.length || !activeVehicles.length) return null;

    const driver = activeDrivers[Math.floor(Math.random() * activeDrivers.length)];
    const vehicle = activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
    const company = companies.find((c) => c._id.toString() === driver.company.toString());
    if (!company) return null;

    const arrivalTime = this.randomArrivalTime(tripDate);
    const statusRandom = Math.random();
    let unloadStatus: UnloadStatus;
    let isTripCanceled = false;
    let isInParkingLot = false;
    let departureTime: Date | null = null;
    let notes = '';

    if (statusRandom < 0.3) {
      unloadStatus = UnloadStatus.WAITING;
      isInParkingLot = true;
      notes = 'Bekliyor - boşaltma için hazır';
    } else if (statusRandom < 0.7) {
      unloadStatus = UnloadStatus.UNLOADED;
      isInParkingLot = false;
      const unloadDuration = Math.floor(Math.random() * 8) + 1;
      departureTime = new Date(arrivalTime.getTime() + unloadDuration * 60 * 60 * 1000);
      notes = `Boşaltıldı - ${unloadDuration} saat sürdü`;
    } else {
      unloadStatus = UnloadStatus.CANCELED;
      isTripCanceled = true;
      isInParkingLot = false;
      notes = 'İptal edildi - çeşitli nedenler';
    }

    if (tripDate > now && unloadStatus !== UnloadStatus.WAITING) {
      unloadStatus = UnloadStatus.WAITING;
      isTripCanceled = false;
      isInParkingLot = true;
      departureTime = null;
      notes = 'Planlanan sefer';
    }

    return {
      arrival_time: arrivalTime,
      departure_time: departureTime,
      unload_status: unloadStatus,
      is_trip_canceled: isTripCanceled,
      is_in_parking_lot: isInParkingLot,
      notes,
      company: company._id,
      driver: driver._id,
      vehicle: vehicle._id,
    };
  }

  private buildRecentTripEntry(
    targetDate: Date,
    dayOffset: number,
    companies: any[],
    drivers: any[],
    vehicles: any[],
  ): any | null {
    const activeDrivers = drivers.filter((d) => !d.deleted);
    const activeVehicles = vehicles.filter((v) => !v.deleted);
    if (!activeDrivers.length || !activeVehicles.length) return null;

    const driver = activeDrivers[Math.floor(Math.random() * activeDrivers.length)];
    const vehicle = activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
    const company = companies.find((c) => c._id.toString() === driver.company.toString());
    if (!company) return null;

    const arrivalTime = this.randomArrivalTime(targetDate);
    const statusRandom = Math.random();
    let unloadStatus: UnloadStatus;
    let isTripCanceled = false;
    let isInParkingLot = false;
    let departureTime: Date | null = null;
    let notes = '';

    if (dayOffset === 0 && statusRandom < 0.4) {
      unloadStatus = UnloadStatus.WAITING;
      isInParkingLot = true;
      notes = 'Bugün gelen - bekliyor';
    } else if (statusRandom < 0.6) {
      unloadStatus = UnloadStatus.UNLOADED;
      isInParkingLot = false;
      const unloadDuration = Math.floor(Math.random() * 6) + 1;
      departureTime = new Date(arrivalTime.getTime() + unloadDuration * 60 * 60 * 1000);
      notes = `Tamamlandı - ${unloadDuration} saat`;
    } else {
      unloadStatus = UnloadStatus.CANCELED;
      isTripCanceled = true;
      isInParkingLot = false;
      notes = 'İptal edildi';
    }

    return {
      arrival_time: arrivalTime,
      departure_time: departureTime,
      unload_status: unloadStatus,
      is_trip_canceled: isTripCanceled,
      is_in_parking_lot: isInParkingLot,
      notes,
      company: company._id,
      driver: driver._id,
      vehicle: vehicle._id,
    };
  }

  private randomArrivalTime(date: Date): Date {
    const arrivalHour = Math.floor(Math.random() * 16) + 6;
    const arrivalMinute = Math.floor(Math.random() * 60);
    const arrivalTime = new Date(date);
    arrivalTime.setHours(arrivalHour, arrivalMinute, 0, 0);
    return arrivalTime;
  }
}
