import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DriversModule } from './drivers/drivers.module';
import { CompaniesModule } from './companies/companies.module';
import { Connection } from 'mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development.local'],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string, {
      onConnectionCreate: (connection: Connection) => {
        connection.on('connected', () => {
          console.log('Connected to MongoDB');
        }); 

        return connection;
      },
    }),
    DriversModule,
    CompaniesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
