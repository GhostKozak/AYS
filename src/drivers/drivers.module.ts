import { Module } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Driver.name, schema: DriverSchema },
      { name: Company.name, schema: CompanySchema },
    ])
  ],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService]
})
export class DriversModule {}
