/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip } from '../../trips/schema/trips.schema';
import { UnloadStatus } from '../../trips/enums/unloadStatus';
import { VerificationStatus } from '../../trips/enums/verificationStatus';

const SEED_YEAR = new Date().getFullYear() - 1;

const randomSeal = () => `SEAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

@Injectable()
export class TripSeeder {
  private readonly logger = new Logger(TripSeeder.name);

  constructor(@InjectModel(Trip.name) private tripModel: Model<Trip>) {}

  async clear() {
    await this.tripModel.deleteMany({});
  }

  async seed(companies: any[], drivers: any[], vehicles: any[]): Promise<void> {
    const trips: any[] = [];
    const now = new Date();
    const startDate = new Date(2025, 0, 1);

    const target = Math.floor(Math.random() * 201) + 300; // 300..500 total trips
    const pendingNeeded = Math.min(20, Math.max(5, Math.floor(target * 0.05))); // at most 20 pending approvals
    const waitingNeeded = Math.max(30, Math.floor(target * 0.06)); // at least 30

    const activeDrivers = drivers.filter((d) => !d.deleted);
    const activeVehicles = vehicles.filter((v) => !v.deleted);
    if (!activeDrivers.length || !activeVehicles.length) return;

    const baseCount = Math.max(0, target - pendingNeeded - waitingNeeded);

    // create base randomized trips across 2025..now
    // Keep total vehicles waiting to unload (is_in_parking_lot) under a global cap
    const MAX_WAITING = 200;
    const allowedWaitingForBase = Math.max(0, MAX_WAITING - waitingNeeded);
    let currentWaiting = 0;

    let attempts = 0;
    while (trips.length < baseCount && attempts < baseCount * 4) {
      attempts++;
      const randTime = startDate.getTime() + Math.floor(Math.random() * (now.getTime() - startDate.getTime()));
      const tripDate = new Date(randTime);
      const entry = this.buildTripEntry(tripDate, now, companies, drivers, vehicles);
      if (!entry) continue;

      // If this entry would be parked/waiting but we've already reached the allowed
      // waiting count for base entries, convert it to an unloaded trip instead.
      if (entry.is_in_parking_lot) {
        if (currentWaiting < allowedWaitingForBase) {
          currentWaiting++;
        } else {
          // convert to unloaded to avoid excessive waiting vehicles
          entry.unload_status = UnloadStatus.UNLOADED;
          entry.is_in_parking_lot = false;
          entry.is_trip_canceled = false;
          // set a small departure_time so it's not treated as parked
          try {
            entry.departure_time = new Date(entry.arrival_time.getTime() + 2 * 60 * 60 * 1000);
          } catch (e) {
            // ignore if arrival_time missing
          }
          entry.notes = (entry.notes || '') + ' (adjusted: converted from WAITING to UNLOADED to respect cap)';
        }
      }

      trips.push(entry);
    }

    // Ensure waitingNeeded trips within last 2 weeks with UnloadStatus.WAITING
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    let addedWaiting = 0;
    attempts = 0;
    while (addedWaiting < waitingNeeded && attempts < waitingNeeded * 10) {
      attempts++;
      const randTime = twoWeeksAgo.getTime() + Math.floor(Math.random() * (now.getTime() - twoWeeksAgo.getTime()));
      const tripDate = new Date(randTime);
      const entry = this.buildTripEntry(tripDate, now, companies, drivers, vehicles);
      if (!entry) continue;
      entry.unload_status = UnloadStatus.WAITING;
      entry.is_in_parking_lot = true;
      entry.parked_at = entry.arrival_time;
      entry.departure_time = null;
      entry.is_trip_canceled = false;
      // Waiting vehicles should be present but NOT necessarily pending verification
      entry.status = VerificationStatus.CONFIRMED;
      trips.push(entry);
      addedWaiting++;
    }

    // Ensure pendingNeeded trips within last 7 days with status PENDING
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let addedPending = 0;
    attempts = 0;
    while (addedPending < pendingNeeded && attempts < pendingNeeded * 10) {
      attempts++;
      const randTime = oneWeekAgo.getTime() + Math.floor(Math.random() * (now.getTime() - oneWeekAgo.getTime()));
      const tripDate = new Date(randTime);
      const entry = this.buildTripEntry(tripDate, now, companies, drivers, vehicles);
      if (!entry) continue;
      entry.status = VerificationStatus.PENDING;
      trips.push(entry);
      addedPending++;
    }

    if (trips.length > 0) {
      await this.tripModel.insertMany(trips, { ordered: false });
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

    const driver =
      activeDrivers[Math.floor(Math.random() * activeDrivers.length)];
    const vehicle =
      activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
    const company = companies.find(
      (c) => c._id.toString() === driver.company.toString(),
    );
    if (!company) return null;

    const arrivalTime = this.randomArrivalTime(tripDate);
    const statusRandom = Math.random();
    let unloadStatus: UnloadStatus;
    let isTripCanceled = false;
    let isInParkingLot = false;
    let departureTime: Date | null = null;
    let notes = '';
    let tripStatus: VerificationStatus = VerificationStatus.CONFIRMED;

      if (statusRandom < 0.25) {
      unloadStatus = UnloadStatus.WAITING;
      isInParkingLot = true;
      departureTime = null;
      notes = 'Bekliyor - boşaltma için hazır';
      } else if (statusRandom < 0.35) {
      unloadStatus = UnloadStatus.UNLOADING;
      isInParkingLot = false;
      notes = 'Boşaltılıyor - sahada';
      } else if (statusRandom < 0.7) {
      unloadStatus = UnloadStatus.UNLOADED;
      isInParkingLot = false;
      const unloadDuration = Math.floor(Math.random() * 8) + 1;
      departureTime = new Date(
        arrivalTime.getTime() + unloadDuration * 60 * 60 * 1000,
      );
      // Unloaded trips are by default confirmed; add a seal for confirmed entries
      tripStatus = VerificationStatus.CONFIRMED;
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
      parked_at: isInParkingLot ? arrivalTime : undefined,
      status: tripStatus,
      notes,
      ...(tripStatus === VerificationStatus.CONFIRMED && unloadStatus === UnloadStatus.UNLOADED
        ? { seal_number: randomSeal() }
        : {}),
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

    const driver =
      activeDrivers[Math.floor(Math.random() * activeDrivers.length)];
    const vehicle =
      activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
    const company = companies.find(
      (c) => c._id.toString() === driver.company.toString(),
    );
    if (!company) return null;

    const arrivalTime = this.randomArrivalTime(targetDate);
    const statusRandom = Math.random();
    let unloadStatus: UnloadStatus;
    let isTripCanceled = false;
    let isInParkingLot = false;
    let departureTime: Date | null = null;
    let notes = '';
    let tripStatus: VerificationStatus = VerificationStatus.CONFIRMED;

    if (dayOffset === 0 && statusRandom < 0.35) {
      unloadStatus = UnloadStatus.WAITING;
      isInParkingLot = true;
      notes = 'Bugün gelen - bekliyor';
    } else if (statusRandom < 0.45) {
      unloadStatus = UnloadStatus.UNLOADING;
      isInParkingLot = false;
      notes = 'Boşaltılıyor - sahada';
    } else if (statusRandom < 0.75) {
      unloadStatus = UnloadStatus.UNLOADED;
      isInParkingLot = false;
      const unloadDuration = Math.floor(Math.random() * 6) + 1;
      departureTime = new Date(
        arrivalTime.getTime() + unloadDuration * 60 * 60 * 1000,
      );
      tripStatus = VerificationStatus.CONFIRMED;
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
      parked_at: isInParkingLot ? arrivalTime : undefined,
      status: tripStatus,
      notes,
      ...(tripStatus === VerificationStatus.CONFIRMED && unloadStatus === UnloadStatus.UNLOADED
        ? { seal_number: randomSeal() }
        : {}),
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
