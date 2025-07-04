import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { Trip, TripSchema } from './schema/trips.schema';
import { CompaniesModule } from '../companies/companies.module';
import { DriversModule } from '../drivers/drivers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema }
    ]),
    CompaniesModule,
    DriversModule,
    VehiclesModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
