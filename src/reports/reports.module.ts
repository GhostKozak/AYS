import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Trip, TripSchema } from '../trips/schema/trips.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
