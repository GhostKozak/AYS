import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { SeedService } from './../src/seed/seed.service';

describe('Trips (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let editorToken: string;
  let dbConnection: Connection;
  let seedService: SeedService;

  // Mock data IDs to be populated during tests
  let tripId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dbConnection = moduleFixture.get(getConnectionToken());
    seedService = moduleFixture.get(SeedService);

    // Clean test database for isolation
    await dbConnection.collection('trips').deleteMany({});
    await dbConnection.collection('companies').deleteMany({});
    await dbConnection.collection('drivers').deleteMany({});
    await dbConnection.collection('vehicles').deleteMany({});
    await dbConnection.collection('auditlogs').deleteMany({});
    await dbConnection.collection('users').deleteMany({});

    // Ensure admin user exists
    await seedService.seedAdminUser();

    // Create an Editor user for visibility tests
    const hashedPassword = await require('bcryptjs').hash('Editor.123.', 10);
    await dbConnection.collection('users').insertOne({
      email: 'editor@test.com',
      password: hashedPassword,
      firstName: 'Editor',
      lastName: 'User',
      role: 'editor',
      isActive: true,
    });

    // Login Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@admin.com', password: 'Admin.123.' });
    adminToken = adminLogin.body.access_token;

    // Login Editor
    const editorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'editor@test.com', password: 'Editor.123.' });
    editorToken = editorLogin.body.access_token;
  });

  afterAll(async () => {
    // Optionally clean up test data if needed
    // await dbConnection.collection('trips').deleteMany({ notes: 'E2E Test Note' });
    await app.close();
  });

  describe('Full Trip Lifecycle', () => {
    it('should create a new trip with auto-created entities (POST /trips)', async () => {
      const response = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'E2E Test Company',
          driver_phone_number: '5550009988',
          driver_full_name: 'E2E Driver',
          licence_plate: 'E2E-PLATE-1',
          vehicle_type: 'TRUCK',
          notes: 'E2E Test Note',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      tripId = response.body._id;
    });

    it('should fail to create a duplicate active trip (POST /trips) - Conflict 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'E2E Test Company',
          driver_phone_number: '5550009988',
          licence_plate: 'E2E-PLATE-1',
        });

      expect(response.status).toBe(409);
    });

    it('should get trip details (GET /trips/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/trips/${tripId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notes).toBe('E2E Test Note');
    });

    it('should update trip status to UNLOADED (PATCH /trips/:id)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/trips/${tripId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          unload_status: 'UNLOADED',
        });

      expect(response.status).toBe(200);
      expect(response.body.unload_status).toBe('UNLOADED');
    });

    it('should allow creating a new trip after the previous one is UNLOADED (POST /trips)', async () => {
      const response = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'E2E Test Company',
          driver_phone_number: '5550009988',
          licence_plate: 'E2E-PLATE-1',
          notes: 'Second E2E Trip',
        });

      expect(response.status).toBe(201);
    });

    it('should soft-delete the trip (DELETE /trips/:id)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/trips/${tripId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Verify it's hidden from normal find (Editor should get 404)
      const getResponse = await request(app.getHttpServer())
        .get(`/trips/${tripId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
