import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Company, CompanyDocument } from '../src/companies/schemas/company.schema';
import { Driver, DriverDocument } from '../src/drivers/schemas/driver.schema';
import { Vehicle, VehicleDocument } from '../src/vehicles/schema/vehicles.schema';
import { Trip, TripDocument } from '../src/trips/schema/trips.schema';
import { CreateTripDto } from 'src/trips/dto/create-trip.dto';

describe('TripsController (e2e)', () => {
  let app: INestApplication;
  let companyModel: Model<CompanyDocument>;
  let driverModel: Model<DriverDocument>;
  let vehicleModel: Model<VehicleDocument>;
  let tripModel: Model<TripDocument>;
  let connection: Connection;

  let testCompany: CompanyDocument;
  let testDriver: DriverDocument;
  let testVehicle: VehicleDocument;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    companyModel = moduleFixture.get(getModelToken(Company.name));
    driverModel = moduleFixture.get(getModelToken(Driver.name));
    vehicleModel = moduleFixture.get(getModelToken(Vehicle.name));
    tripModel = moduleFixture.get(getModelToken(Trip.name));
    connection = moduleFixture.get(getConnectionToken());
  });

  beforeEach(async () => {
    testCompany = await companyModel.create({ name: 'E2E Test Company' });
    testDriver = await driverModel.create({ full_name: 'E2E Test Driver', phone_number: '5559876543', company: testCompany._id });
    testVehicle = await vehicleModel.create({ licence_plate: '34E2E34' });
  });

  afterEach(async () => {
    await connection.collection('trips').deleteMany({});
    await connection.collection('drivers').deleteMany({});
    await connection.collection('companies').deleteMany({});
    await connection.collection('vehicles').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /trips', () => {
    it('should create a new trip with existing relations', async () => {
      const createTripDto: CreateTripDto = {
        driver_phone_number: testDriver.phone_number,
        company_name: testCompany.name,
        licence_plate: testVehicle.licence_plate,
        notes: 'Test trip',
      };

      return request(app.getHttpServer())
        .post('/trips')
        .send(createTripDto)
        .expect(201)
        .then((res) => {
          expect(res.body).toBeDefined();
          expect(res.body.driver).toEqual(testDriver._id.toString());
          expect(res.body.company).toEqual(testCompany._id.toString());
          expect(res.body.vehicle).toEqual(testVehicle._id.toString());
          expect(res.body.notes).toEqual('Test trip');
        });
    });

    it('should create a new trip and a new driver', async () => {
        const createTripDto: CreateTripDto = {
            driver_phone_number: '5550001122',
            driver_full_name: 'Brand New Driver',
            company_name: testCompany.name,
            licence_plate: testVehicle.licence_plate,
        };

        return request(app.getHttpServer())
        .post('/trips')
        .send(createTripDto)
        .expect(201)
        .then(async (res) => {
            const driverInDb = await driverModel.findOne({ phone_number: '5550001122' });
            expect(driverInDb).not.toBeNull();
            expect(res.body.driver).toEqual(driverInDb!._id.toString());
        });
    });
  });

  describe('GET /trips/:id', () => {
      it('should get a trip by id', async () => {
          const trip = await tripModel.create({
              driver: testDriver._id,
              company: testCompany._id,
              vehicle: testVehicle._id
          });

          return request(app.getHttpServer())
            .get(`/trips/${trip._id}`)
            .expect(200)
            .then(res => {
                expect(res.body._id).toEqual(trip._id.toString());
            });
      });
  });
});