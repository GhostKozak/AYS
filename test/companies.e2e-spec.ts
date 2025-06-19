import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { CompanyDocument } from '../src/companies/schemas/company.schema';

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
    await app.init();

    companyModel = moduleFixture.get<Model<CompanyDocument>>(getModelToken('Company'));
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });
  
  // Her testten sonra genel temizlik
  afterEach(async () => {
    await companyModel.deleteMany({});
    await connection.collection('companies').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('POST /companies', () => {
    it('should create a new company', async () => {
      const companyDto = { name: 'Yeni Harika Şirket' };
      const normalizedName = 'yeniharikasirket';

      const response = await request(app.getHttpServer())
        .post('/companies')
        .send(companyDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toEqual(companyDto.name);

      const companyInDb = await companyModel.findById(response.body._id);
      expect(companyInDb).not.toBeNull();
      expect(companyInDb!.name).toEqual(companyDto.name);
      expect(companyInDb!.name_normalized).toEqual(normalizedName);
    });
  });

  describe('with an existing company', () => {
    let company: CompanyDocument;

    beforeEach(async () => {
      company = await companyModel.create({ name: 'Mevcut Test Şirketi', name_normalized: 'mevcuttestsirketi' });
    });

    it('/companies (GET) - should get an array of companies', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .expect(200);
      
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toEqual(company.name);
    });

    describe('/companies/:id (GET)', () => {
      it('should get a single company by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/companies/${company._id}`)
          .expect(200);

        expect(response.body.name).toEqual(company.name);
      });

      it('should return 404 if company is not found', async () => {
        const invalidId = new Types.ObjectId().toHexString();
        await request(app.getHttpServer())
          .get(`/companies/${invalidId}`)
          .expect(404);
      });
    });

    it('/companies/:id (PATCH) - should update a company', async () => {
        const updateDto = { name: 'Güncellenmiş İsim' };
        const updatedNormalizedName = 'guncellenmisisim';

        const response = await request(app.getHttpServer())
          .patch(`/companies/${company._id}`)
          .send(updateDto)
          .expect(200);

        expect(response.body.name).toEqual(updateDto.name);
        
        const companyInDb = await companyModel.findById(company._id);
        expect(companyInDb!.name).toEqual(updateDto.name);
        expect(companyInDb!.name_normalized).toEqual(updatedNormalizedName);
    });

    it('/companies/:id (DELETE) - should soft delete a company', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/companies/${company._id}`)
        .expect(200);

      expect(response.body.deleted).toBe(true);
      
      const companyInDb = await companyModel.findById(company._id);
      expect(companyInDb!.deleted).toBe(true);
    });
  });

  describe('Validation & Constraints', () => {
    it('should return 400 if name is missing', async () => {
      const companyDto = {};
      await request(app.getHttpServer())
        .post('/companies')
        .send(companyDto)
        .expect(400);
    });

    it('should return 400 if name is empty', async () => {
      const companyDto = { name: '' };
      await request(app.getHttpServer())
        .post('/companies')
        .send(companyDto)
        .expect(400);
    });

    it('should return 409 if name_normalized is not unique', async () => {
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

  describe('Soft deleted companies', () => {
    let deletedCompany: CompanyDocument;
    beforeEach(async () => {
      deletedCompany = await companyModel.create({ name: 'Silinecek Şirket', name_normalized: 'silineceksirket', deleted: true });
    });

    it('should not list soft deleted companies', async () => {
      const response = await request(app.getHttpServer())
        .get('/companies')
        .expect(200);
      // Silinen şirket listede olmamalı
      expect(response.body.find((c: any) => c._id === deletedCompany._id.toString())).toBeUndefined();
    });
  });
});