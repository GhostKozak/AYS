import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schema/vehicles.schema';
import { Trip, TripSchema } from '../trips/schema/trips.schema';
import { UserSeeder } from './seeders/user.seeder';
import { CompanySeeder } from './seeders/company.seeder';
import { DriverSeeder } from './seeders/driver.seeder';
import { VehicleSeeder } from './seeders/vehicle.seeder';
import { TripSeeder } from './seeders/trip.seeder';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Trip.name, schema: TripSchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [
    SeedService,
    UserSeeder,
    CompanySeeder,
    DriverSeeder,
    VehicleSeeder,
    TripSeeder,
  ],
  exports: [SeedService],
})
export class SeedModule {}
