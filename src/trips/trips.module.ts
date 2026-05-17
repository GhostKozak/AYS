import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { Trip, TripSchema } from './schema/trips.schema';
import { CompaniesModule } from '../companies/companies.module';
import { DriversModule } from '../drivers/drivers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';
import { TripEntityResolverService } from './trip-entity-resolver.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trip.name, schema: TripSchema }]),
    CompaniesModule,
    DriversModule,
    VehiclesModule,
    AuditModule,
    EventsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TripEntityResolverService],
})
export class TripsModule {}

