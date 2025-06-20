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
    await connection.collection('companies').deleteMany({});
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

      const companyInDb = await companyModel.findById(response.body._id);
      expect(companyInDb).not.toBeNull();
      expect(companyInDb!.name).toEqual(companyDto.name);
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
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toEqual(company.name);
    });

    it('GET /companies/:id - id ile şirket getirir', async () => {
      const response = await request(app.getHttpServer())
        .get(`/companies/${company._id}`)
        .expect(200);
      expect(response.body.name).toEqual(company.name);
    });

    it('GET /companies/:id - bulunamazsa 404 döner', async () => {
      const invalidId = new Types.ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`/companies/${invalidId}`)
        .expect(404);
    });

    it('PATCH /companies/:id - şirket günceller', async () => {
      const updateDto = { name: 'Güncel İsim' };
      const response = await request(app.getHttpServer())
        .patch(`/companies/${company._id}`)
        .send(updateDto)
        .expect(200);
      expect(response.body.name).toEqual(updateDto.name);
      const companyInDb = await companyModel.findById(company._id);
      expect(companyInDb!.name).toEqual(updateDto.name);
    });

    it('DELETE /companies/:id - şirketi soft siler', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/companies/${company._id}`)
        .expect(200);
      expect(response.body.deleted).toBe(true);
      const companyInDb = await companyModel.findById(company._id);
      expect(companyInDb!.deleted).toBe(true);
    });
  });

  describe('Validasyon & Kısıtlar', () => {
    it('isim eksikse 400 döner', async () => {
      await request(app.getHttpServer())
        .post('/companies')
        .send({})
        .expect(400);
    });

    it('isim boşsa 400 döner', async () => {
      await request(app.getHttpServer())
        .post('/companies')
        .send({ name: '' })
        .expect(400);
    });

    it('aynı name ile ekleme 409 döner', async () => {
      const companyDto = { name: 'Tekrarlı Şirket' };
      await request(app.getHttpServer())
        .post('/companies')
        .send(companyDto)
        .expect(201);
      await request(app.getHttpServer())
        .post('/companies')
        .send(companyDto)
        .expect(409);
    });
  });

  describe('Soft silinen şirketler', () => {
    let deletedCompany: CompanyDocument;
    beforeEach(async () => {
      deletedCompany = await companyModel.create({ name: 'Silinecek Şirket', deleted: true });
    });

    it('soft silinen şirket listede olmamalı', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .expect(200);
      expect(response.body.find((c: any) => c._id === deletedCompany._id.toString())).toBeUndefined();
    });
  });
});