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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new MongoExceptionFilter());
    await app.init();

    companyModel = moduleFixture.get<Model<CompanyDocument>>(getModelToken('Company'));
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    await connection.collection('companies').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /companies', () => {
    it('isim ile yeni şirket oluşturur', async () => {
      const companyDto = { name: 'Test Şirketi' };

      const response = await request(app.getHttpServer())
        .post('/companies')
        .send(companyDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toEqual(companyDto.name);
    });
  });

  describe('Mevcut şirket ile işlemler', () => {
    let company: CompanyDocument;

    beforeEach(async () => {
      company = await companyModel.create({ name: 'Mevcut Şirket' });
    });

    it('GET /companies - şirketleri listeler', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .expect(200);
        
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toEqual(company.name);
    });

    it('GET /companies/:id - id ile şirket getirir', async () => {
      const response = await request(app.getHttpServer())
        .get(`/companies/${company._id}`)
        .expect(200);
      expect(response.body.name).toEqual(company.name);
    });

    it('PATCH /companies/:id - şirket günceller', async () => {
      const updateDto = { name: 'Güncel İsim' };
      const response = await request(app.getHttpServer())
        .patch(`/companies/${company._id}`)
        .send(updateDto)
        .expect(200);
      expect(response.body.name).toEqual(updateDto.name);
    });
  });
  
  describe('Soft silinen şirketler', () => {
    let deletedCompany: CompanyDocument;
    beforeEach(async () => {
      await companyModel.create({ name: 'Aktif Şirket' });
      deletedCompany = await companyModel.create({ name: 'Silinecek Şirket', deleted: true });
    });

    it('soft silinen şirket listede olmamalı', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data.find((c: any) => c._id === deletedCompany._id.toString())).toBeUndefined();
    });
  });
});