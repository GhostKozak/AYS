import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { SeedService } from '../src/seed/seed.service';
import { MongoExceptionFilter } from '../src/filters/mongo-exception.filter';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let adminToken: string;
  let seedService: SeedService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    const i18n = app.get(require('nestjs-i18n').I18nService);
    app.useGlobalFilters(new MongoExceptionFilter(i18n));
    await app.init();

    connection = app.get(getConnectionToken());
    seedService = app.get(SeedService);

    // Clean up and seed
    await connection.collection('users').deleteMany({});
    await seedService.seedAdminUser();
    
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@admin.com',
        password: 'Admin.123.',
      });
    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('GET /reports/top-companies', () => {
    it('should return top companies list', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/top-companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /reports/unload-waiting', () => {
    it('should return waiting stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/unload-waiting')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /reports/dashboard-summary', () => {
    it('should return dashboard summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/dashboard-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('today');
      expect(response.body.today).toHaveProperty('totalTrips');
      expect(response.body.today).toHaveProperty('waitingToUnload');
      expect(response.body.today).toHaveProperty('topCompanies');
      expect(response.body).toHaveProperty('totalCompanies');
      expect(response.body).toHaveProperty('totalDrivers');
    });
  });

  describe('GET /reports/status-distribution', () => {
    it('should return status distribution stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/status-distribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('statuses');
      expect(response.body).toHaveProperty('inParkingLot');
      expect(response.body).toHaveProperty('canceled');
    });
  });

  describe('GET /reports/average-turnaround', () => {
    it('should return average turnaround time', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/average-turnaround')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('averageMinutes');
      expect(response.body).toHaveProperty('tripCount');
    });
  });

  describe('GET /reports/trend', () => {
    it('should return time-series trend data', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/trend')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('timestamp');
        expect(response.body[0]).toHaveProperty('count');
      }
    });
  });

  describe('GET /reports/export/excel', () => {
    it('should return excel file buffer', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/export/excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.header['content-disposition']).toContain('attachment; filename=trips-report.xlsx');
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /reports/export/pdf', () => {
    it('should return pdf file buffer', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/export/pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/pdf');
      expect(response.header['content-disposition']).toContain('attachment; filename=trips-report.pdf');
      expect(response.body).toBeDefined();
    });
  });
});
