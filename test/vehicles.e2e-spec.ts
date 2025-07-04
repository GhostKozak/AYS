import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../src/vehicles/schema/vehicles.schema';
import { VehicleType } from '../src/vehicles/enums/vehicleTypes';

describe('VehiclesController (e2e)', () => {
  let app: INestApplication;
  let vehicleModel: Model<VehicleDocument>;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    vehicleModel = moduleFixture.get(getModelToken(Vehicle.name));
    connection = moduleFixture.get(getConnectionToken());
  });

  afterEach(async () => {
    await connection.collection('vehicles').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /vehicles', () => {
    it('should create a new vehicle', () => {
      const createVehicleDto = {
        licence_plate: '34 E2E 34',
        vehicle_type: VehicleType.LORRY,
      };

      return request(app.getHttpServer())
        .post('/vehicles')
        .send(createVehicleDto)
        .expect(201)
        .then(async (res) => {
          expect(res.body.licence_plate).toEqual('34E2E34');
          expect(res.body.vehicle_type).toEqual(VehicleType.LORRY);
          const vehicleInDb = await vehicleModel.findById(res.body._id);
          expect(vehicleInDb).not.toBeNull();
        });
    });

    it('should return 400 for missing licence_plate', () => {
        return request(app.getHttpServer())
          .post('/vehicles')
          .send({ vehicle_type: VehicleType.TRUCK })
          .expect(400);
      });
  });

  describe('GET /vehicles', () => {
      it('should return a list of vehicles', async () => {
          await vehicleModel.create({ licence_plate: '34LIST01' });
          await vehicleModel.create({ licence_plate: '34LIST02' });

          return request(app.getHttpServer())
            .get('/vehicles')
            .expect(200)
            .then(res => {
                expect(res.body.data.length).toBe(2);
            })
      });
  });

  describe('DELETE /vehicles/:id', () => {
      it('should soft-delete a vehicle', async () => {
          const vehicle = await vehicleModel.create({ licence_plate: '34DEL01' });

          await request(app.getHttpServer())
            .delete(`/vehicles/${vehicle._id}`)
            .expect(200);

            const deletedVehicle = await vehicleModel.findById(vehicle._id);
            expect(deletedVehicle?.deleted).toBe(true);
      })
  })
});