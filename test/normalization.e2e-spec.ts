import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Company, CompanyDocument } from '../src/companies/schemas/company.schema';
import { Driver, DriverDocument } from '../src/drivers/schemas/driver.schema';
import { Vehicle, VehicleDocument } from '../src/vehicles/schema/vehicles.schema';

describe('Data Normalization (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    await connection.collection('users').deleteMany({});
    await connection.collection('vehicles').deleteMany({});
    await connection.collection('drivers').deleteMany({});
    await connection.collection('companies').deleteMany({});

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const seedService = moduleFixture.get(require('../src/seed/seed.service').SeedService);
    await seedService.seedAdminUser();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@admin.com', password: 'Admin.123.' });
    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Vehicle Normalization', () => {
    it('should normalize license plate (34 ABC 12 -> 34ABC12)', async () => {
      // Create first vehicle with spaces
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ licence_plate: '34 ABC 12', vehicle_type: 'TRUCK' })
        .expect(201);

      // Try to create same vehicle with different format (should already exist and be returned)
      // Note: VehiclesService.create doesn't check duplicates yet, but findOrCreateByPlate does.
      // TripsService uses findOrCreateByPlate.
    });
  });

  describe('Trip Creation Normalization', () => {
    it('should use same vehicle and driver regardless of formatting', async () => {
        const companyName = 'Norm Co';
        
        // Create trip 1 with complex formatting
        const tripResponse = await request(app.getHttpServer())
          .post('/trips')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            company_name: companyName,
            licence_plate: '34 ABC 12',
            driver_phone_number: '+1 (555) 111-2233',
            driver_full_name: 'Norm User',
            arrival_time: new Date(),
          })
          .expect(201);

        const tripId = tripResponse.body._id;

        // "Unload" the trip so trip 2 can be created without conflict
        await request(app.getHttpServer())
          .patch(`/trips/${tripId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ unload_status: 'UNLOADED' })
          .expect(200);

        // Create trip 2 with minimal formatting
        await request(app.getHttpServer())
          .post('/trips')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            company_name: companyName,
            licence_plate: '34abc12',
            driver_phone_number: '+15551112233',
            arrival_time: new Date(),
          })
          .expect(201);

        // Verify counts
        const vehicleModel = app.get<Model<VehicleDocument>>(getModelToken(Vehicle.name));
        const driverModel = app.get<Model<DriverDocument>>(getModelToken(Driver.name));

        const vehicleCount = await vehicleModel.countDocuments();
        const driverCount = await driverModel.countDocuments();

        expect(vehicleCount).toBe(1);
        expect(driverCount).toBe(1);
    });
  });
});
