import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { CompanyDocument } from '../src/companies/schemas/company.schema';
import { MongoExceptionFilter } from '../src/filters/mongo-exception.filter';

describe('CompaniesController (e2e)', () => {
  let app: INestApplication;
  let companyModel: Model<CompanyDocument>;
  let connection: Connection;
  let adminToken: string;
  let editorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    await connection.collection('users').deleteMany({});

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    const i18n = app.get(require('nestjs-i18n').I18nService);
    app.useGlobalFilters(new MongoExceptionFilter(i18n));
    await app.init();

    companyModel = moduleFixture.get<Model<CompanyDocument>>(getModelToken('Company'));

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
    await connection.collection('companies').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /companies', () => {
    it('creates a new company by name', async () => {
      const companyDto = { name: 'Test Company' };

      const response = await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(companyDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toEqual(companyDto.name);
    });
  });

  describe('Operations with existing company', () => {
    let company: CompanyDocument;

    beforeEach(async () => {
      company = await companyModel.create({ name: 'Existing Company' }) as any;
    });

    it('GET /companies - lists companies', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
        
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toEqual(company.name);
    });

    it('GET /companies/:id - gets company by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(response.body.name).toEqual(company.name);
    });

    it('PATCH /companies/:id - updates company', async () => {
      const updateDto = { name: 'Updated Name' };
      const response = await request(app.getHttpServer())
        .patch(`/companies/${company._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);
      expect(response.body.name).toEqual(updateDto.name);
    });
  });
  
  describe('Soft deleted companies', () => {
    let deletedCompany: CompanyDocument;
    beforeEach(async () => {
      await companyModel.create({ name: 'Active Company' });
      deletedCompany = await companyModel.create({ name: 'Deleted Company', deleted: true }) as any;
    });

    it('soft deleted company should not be in the list', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data.find((c: any) => c._id === (deletedCompany as any)._id.toString())).toBeUndefined();
    });
  });
});