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
  let adminToken: string;
  let editorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    connection = moduleFixture.get(getConnectionToken());
    await connection.collection('users').deleteMany({});

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    vehicleModel = moduleFixture.get(getModelToken(Vehicle.name));

    const seedService = moduleFixture.get(require('../src/seed/seed.service').SeedService);
    await seedService.seedAdminUser();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@admin.com', password: 'Admin.123.' });
    adminToken = loginResponse.body.access_token;

    // Create and login Editor
    const hashedPassword = await require('bcryptjs').hash('Editor.123.', 10);
    await connection.collection('users').insertOne({
      email: 'editor@test.com',
      password: hashedPassword,
      firstName: 'Editor',
      lastName: 'User',
      role: 'editor',
      isActive: true,
    });
    const editorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'editor@test.com', password: 'Editor.123.' });
    editorToken = editorLogin.body.access_token;
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
        .set('Authorization', `Bearer ${adminToken}`)
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
          .set('Authorization', `Bearer ${adminToken}`)
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
            .set('Authorization', `Bearer ${adminToken}`)
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
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

            // Verify it's hidden from normal find (Editor should get 404)
            await request(app.getHttpServer())
              .get(`/vehicles/${vehicle._id}`)
              .set('Authorization', `Bearer ${editorToken}`)
              .expect(404);
      })
  })
});