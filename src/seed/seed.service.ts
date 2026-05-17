import { Injectable, Logger } from '@nestjs/common';
import { UserSeeder } from './seeders/user.seeder';
import { CompanySeeder } from './seeders/company.seeder';
import { DriverSeeder } from './seeders/driver.seeder';
import { VehicleSeeder } from './seeders/vehicle.seeder';
import { TripSeeder } from './seeders/trip.seeder';

/**
 * SeedService yalnızca orkestrasyon yapar.
 * Tüm domain-spesifik seed mantığı ilgili Seeder sınıflarındadır.
 *
 * Bağımlılık: 5 Seeder → her biri kendi tek domain Model'ine bağlı.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly userSeeder: UserSeeder,
    private readonly companySeeder: CompanySeeder,
    private readonly driverSeeder: DriverSeeder,
    private readonly vehicleSeeder: VehicleSeeder,
    private readonly tripSeeder: TripSeeder,
  ) {}

  async seedAdminUser() {
    return this.userSeeder.seedAdminUser();
  }

  async seedAllData() {
    this.logger.log('Starting comprehensive seed...');

    // Temizle
    await this.tripSeeder.clear();
    await this.driverSeeder.clear();
    await this.vehicleSeeder.clear();
    await this.companySeeder.clear();

    // Korunan kullanıcıları sakla, test kullanıcılarını temizle
    await this.userSeeder.seedSystemUser();
    await this.userSeeder.clearNonProtected();

    // Seed
    await this.userSeeder.seedTestUsers();
    const companies = await this.companySeeder.seed();
    const drivers = await this.driverSeeder.seed(companies);
    const vehicles = await this.vehicleSeeder.seed(companies);
    await this.tripSeeder.seed(companies, drivers, vehicles);

    this.logger.log('Comprehensive seed completed successfully!');
  }
}
