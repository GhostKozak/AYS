import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DriversModule } from './drivers/drivers.module';
import { CompaniesModule } from './companies/companies.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? 
        ['.env.test.local'] : 
        ['.env', '.env.development.local'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    DriversModule,
    CompaniesModule,
    VehiclesModule,
    TripsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
