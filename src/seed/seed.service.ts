/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../users/schemas/user.schema';
import { Company } from '../companies/schemas/company.schema';
import { Driver } from '../drivers/schemas/driver.schema';
import { Vehicle } from '../vehicles/schema/vehicles.schema';
import { VehicleType } from '../vehicles/enums/vehicleTypes';
import { Trip } from '../trips/schema/trips.schema';
import { UnloadStatus } from '../trips/enums/unloadStatus';
import * as bcrypt from 'bcryptjs';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(Trip.name) private tripModel: Model<Trip>,
    private readonly i18n: I18nService,
  ) {}

  async seedAdminUser() {
    const existingAdmin = await this.userModel.findOne({
      email: 'admin@admin.com',
    });

    if (!existingAdmin) {
      const initialPassword =
        process.env.INITIAL_ADMIN_PASSWORD || 'Admin.123.';
      const hashedPassword = await bcrypt.hash(initialPassword, 10);

      const adminUser = new this.userModel({
        email: 'admin@admin.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      });

      await adminUser.save();
      this.logger.log(this.i18n.translate('seed.ADMIN_USER_CREATED'));
    } else {
      this.logger.log(this.i18n.translate('seed.ADMIN_USER_ALREADY_EXISTS'));
    }
  }

  async seedAllData() {
    this.logger.log('Starting comprehensive seed...');

    // Clear existing data
    await this.tripModel.deleteMany({});
    await this.driverModel.deleteMany({});
    await this.vehicleModel.deleteMany({});
    await this.companyModel.deleteMany({});
    await this.userModel.deleteMany({ email: { $ne: 'admin@admin.com' } });

    // Seed Users
    await this.seedUsers();

    // Seed Companies
    const companies = await this.seedCompanies();

    // Seed Drivers
    const drivers = await this.seedDrivers(companies);

    // Seed Vehicles
    const vehicles = await this.seedVehicles(companies);

    // Seed Trips
    await this.seedTrips(companies, drivers, vehicles);

    this.logger.log('Comprehensive seed completed successfully!');
  }

  private async seedUsers() {
    const users = [
      {
        email: 'editor@test.com',
        password: await bcrypt.hash('Editor.123', 10),
        firstName: 'Editor',
        lastName: 'User',
        role: UserRole.EDITOR,
        isActive: true,
      },
      {
        email: 'viewer@test.com',
        password: await bcrypt.hash('Viewer.123', 10),
        firstName: 'Viewer',
        lastName: 'User',
        role: UserRole.VIEWER,
        isActive: true,
      },
      {
        email: 'inactive@test.com',
        password: await bcrypt.hash('Inactive.123', 10),
        firstName: 'Inactive',
        lastName: 'User',
        role: UserRole.VIEWER,
        isActive: false,
      },
    ];

    for (const userData of users) {
      await this.userModel.create(userData);
    }
    this.logger.log('Users seeded');
  }

  private async seedCompanies() {
    const companies: any[] = [
      { name: 'ABC Lojistik Ltd.' },
      { name: 'XYZ Taşımacılık A.Ş.' },
      { name: 'Global Nakliyat Co.' },
      { name: 'Mega Transport Inc.' },
      { name: 'Fast Delivery Ltd.' },
      { name: 'Prime Logistics A.Ş.' },
      { name: 'Elite Cargo Co.' },
      { name: 'Speed Transport Ltd.' },
      { name: 'Reliable Shipping A.Ş.' },
      { name: 'Pro Express Co.' },
      { name: 'Silinen Firma Ltd.', deleted: true },
      { name: 'Eski Firma A.Ş.', deleted: true },
      { name: 'Kapanmış Nakliyat Co.', deleted: true },
    ];

    const createdCompanies: any[] = [];
    for (const companyData of companies) {
      const company = await this.companyModel.create(companyData);
      createdCompanies.push(company);
    }
    this.logger.log('Companies seeded');
    return createdCompanies;
  }

  private async seedDrivers(companies: any[]) {
    const driverNames = [
      'Ahmet Yılmaz',
      'Mehmet Kaya',
      'Ali Demir',
      'Ayşe Yıldız',
      'Fatma Çelik',
      'Hasan Öztürk',
      'Emine Şahin',
      'Mustafa Aydın',
      'Zeynep Kara',
      'Hüseyin Yıldırım',
      'Elif Demir',
      'İbrahim Çelik',
      'Sevgi Aydın',
      'Osman Yıldız',
      'Gülşen Kaya',
      'Ramazan Öztürk',
      'Hatice Şahin',
      'Yusuf Kara',
      'Merve Yıldırım',
      'Halil Demir',
      'Sultan Çelik',
      'Recep Aydın',
      'Nur Yıldız',
      'Salih Kaya',
      'Zehra Öztürk',
      'Kemal Şahin',
      'Filiz Kara',
      'İsmail Yıldırım',
      'Hacer Demir',
      'Fatih Çelik',
      'Dilek Aydın',
      'Orhan Yıldız',
      'Gizem Kaya',
      'Burak Öztürk',
      'Esra Şahin',
    ];

    const drivers: any[] = [];
    let driverIndex = 0;

    // Her firma için 15-30 sürücü
    for (
      let companyIndex = 0;
      companyIndex < companies.length;
      companyIndex++
    ) {
      const company = companies[companyIndex];
      const driverCount = Math.floor(Math.random() * 16) + 15; // 15-30 arası

      for (
        let i = 0;
        i < driverCount && driverIndex < driverNames.length * 3;
        i++
      ) {
        const isDeleted = company.deleted || Math.random() < 0.1; // %10 silinmiş sürücü
        drivers.push({
          full_name:
            driverNames[driverIndex % driverNames.length] +
            (driverIndex >= driverNames.length
              ? ` ${Math.floor(driverIndex / driverNames.length) + 1}`
              : ''),
          phone_number: `+90555${String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')}`,
          company: company._id,
          ...(isDeleted && { deleted: true }),
        });
        driverIndex++;
      }
    }

    const createdDrivers: any[] = [];
    for (const driverData of drivers) {
      const driver = await this.driverModel.create(driverData);
      createdDrivers.push(driver);
    }
    this.logger.log(`Drivers seeded: ${createdDrivers.length}`);
    return createdDrivers;
  }

  private async seedVehicles(companies: any[]) {
    const cities = ['34', '35', '06', '16', '07', '01', '26', '31', '41', '33'];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const vehicles: any[] = [];

    // Her firma için 5-15 araç
    for (
      let companyIndex = 0;
      companyIndex < companies.length;
      companyIndex++
    ) {
      const company = companies[companyIndex];
      const vehicleCount = Math.floor(Math.random() * 11) + 5; // 5-15 arası

      for (let i = 0; i < vehicleCount; i++) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const letter1 = letters[Math.floor(Math.random() * letters.length)];
        const letter2 = letters[Math.floor(Math.random() * letters.length)];
        const letter3 = letters[Math.floor(Math.random() * letters.length)];
        const number = String(Math.floor(Math.random() * 900) + 100).padStart(
          3,
          '0',
        );

        const licencePlate = `${city}${letter1}${letter2}${letter3}${number}`;
        const vehicleType =
          Math.random() < 0.7 ? VehicleType.TRUCK : VehicleType.VAN;

        vehicles.push({
          licence_plate: licencePlate,
          vehicle_type: vehicleType,
          company: company._id,
        });
      }
    }

    const createdVehicles: any[] = [];
    for (const vehicleData of vehicles) {
      const vehicle = await this.vehicleModel.create(vehicleData);
      createdVehicles.push(vehicle);
    }
    this.logger.log(`Vehicles seeded: ${createdVehicles.length}`);
    return createdVehicles;
  }

  private async seedTrips(companies: any[], drivers: any[], vehicles: any[]) {
    const trips: any[] = [];
    const now = new Date();

    // 2025 yılı için aylık dağılım
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2025, month + 1, 0).getDate();

      // Her ay için rastgele günler
      for (
        let day = 1;
        day <= daysInMonth;
        day += Math.floor(Math.random() * 3) + 1
      ) {
        const tripDate = new Date(2025, month, day);

        // Günlük 10-30 sefer arası
        const dailyTrips = Math.floor(Math.random() * 21) + 10;

        for (let i = 0; i < dailyTrips; i++) {
          // Rastgele sürücü ve araç seç (aktif olanlardan)
          const activeDrivers = drivers.filter((d) => !d.deleted);
          const activeVehicles = vehicles.filter((v) => !v.deleted);

          if (activeDrivers.length === 0 || activeVehicles.length === 0)
            continue;

          const driver =
            activeDrivers[Math.floor(Math.random() * activeDrivers.length)];
          const vehicle =
            activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
          const company = companies.find(
            (c) => c._id.toString() === driver.company.toString(),
          );

          if (!company) continue;

          // Varış saati: gün içinde rastgele
          const arrivalHour = Math.floor(Math.random() * 16) + 6; // 06:00 - 22:00 arası
          const arrivalMinute = Math.floor(Math.random() * 60);
          const arrivalTime = new Date(tripDate);
          arrivalTime.setHours(arrivalHour, arrivalMinute, 0, 0);

          // Durum belirleme
          const statusRandom = Math.random();
          let unloadStatus: UnloadStatus;
          let isTripCanceled = false;
          let isInParkingLot = false;
          let departureTime: Date | null = null;
          let notes = '';

          if (statusRandom < 0.3) {
            // Bekliyor
            unloadStatus = UnloadStatus.WAITING;
            isInParkingLot = true;
            notes = 'Bekliyor - boşaltma için hazır';
          } else if (statusRandom < 0.7) {
            // Boşaltıldı
            unloadStatus = UnloadStatus.UNLOADED;
            isInParkingLot = false;
            const unloadDuration = Math.floor(Math.random() * 8) + 1; // 1-8 saat
            departureTime = new Date(
              arrivalTime.getTime() + unloadDuration * 60 * 60 * 1000,
            );
            notes = `Boşaltıldı - ${unloadDuration} saat sürdü`;
          } else {
            // İptal edildi
            unloadStatus = UnloadStatus.CANCELED;
            isTripCanceled = true;
            isInParkingLot = false;
            notes = 'İptal edildi - çeşitli nedenler';
          }

          // Gelecek tarihler için sadece bekliyor durumu
          if (tripDate > now && unloadStatus !== UnloadStatus.WAITING) {
            unloadStatus = UnloadStatus.WAITING;
            isTripCanceled = false;
            isInParkingLot = true;
            departureTime = null;
            notes = 'Planlanan sefer';
          }

          trips.push({
            arrival_time: arrivalTime,
            departure_time: departureTime,
            unload_status: unloadStatus,
            is_trip_canceled: isTripCanceled,
            is_in_parking_lot: isInParkingLot,
            notes: notes,
            company: company._id,
            driver: driver._id,
            vehicle: vehicle._id,
          });
        }
      }
    }

    // Ek olarak bugün ve dün için daha fazla sefer
    const today = new Date();

    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const targetDate = new Date(
        today.getTime() - dayOffset * 24 * 60 * 60 * 1000,
      );

      for (let i = 0; i < 20; i++) {
        const activeDrivers = drivers.filter((d) => !d.deleted);
        const activeVehicles = vehicles.filter((v) => !v.deleted);

        if (activeDrivers.length === 0 || activeVehicles.length === 0) continue;

        const driver =
          activeDrivers[Math.floor(Math.random() * activeDrivers.length)];
        const vehicle =
          activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
        const company = companies.find(
          (c) => c._id.toString() === driver.company.toString(),
        );

        if (!company) continue;

        const arrivalHour = Math.floor(Math.random() * 16) + 6;
        const arrivalMinute = Math.floor(Math.random() * 60);
        const arrivalTime = new Date(targetDate);
        arrivalTime.setHours(arrivalHour, arrivalMinute, 0, 0);

        const statusRandom = Math.random();
        let unloadStatus: UnloadStatus;
        let isTripCanceled = false;
        let isInParkingLot = false;
        let departureTime: Date | null = null;
        let notes = '';

        if (dayOffset === 0 && statusRandom < 0.4) {
          // Bugün için daha fazla bekliyor
          unloadStatus = UnloadStatus.WAITING;
          isInParkingLot = true;
          notes = 'Bugün gelen - bekliyor';
        } else if (statusRandom < 0.6) {
          unloadStatus = UnloadStatus.UNLOADED;
          isInParkingLot = false;
          const unloadDuration = Math.floor(Math.random() * 6) + 1;
          departureTime = new Date(
            arrivalTime.getTime() + unloadDuration * 60 * 60 * 1000,
          );
          notes = `Tamamlandı - ${unloadDuration} saat`;
        } else {
          unloadStatus = UnloadStatus.CANCELED;
          isTripCanceled = true;
          isInParkingLot = false;
          notes = 'İptal edildi';
        }

        trips.push({
          arrival_time: arrivalTime,
          departure_time: departureTime,
          unload_status: unloadStatus,
          is_trip_canceled: isTripCanceled,
          is_in_parking_lot: isInParkingLot,
          notes: notes,
          company: company._id,
          driver: driver._id,
          vehicle: vehicle._id,
        });
      }
    }

    // Veritabanına kaydet
    for (const tripData of trips) {
      await this.tripModel.create(tripData);
    }
    this.logger.log(`Trips seeded: ${trips.length}`);
  }
}
