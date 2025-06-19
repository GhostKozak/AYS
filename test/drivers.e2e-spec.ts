import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Driver, DriverDocument } from '../src/drivers/schemas/driver.schema';
import { Company, CompanyDocument } from '../src/companies/schemas/company.schema';

describe('DriversController (e2e)', () => {
  let app: INestApplication;
  let driverModel: Model<DriverDocument>;
  let companyModel: Model<CompanyDocument>;
  let connection: Connection;

  // Testler için kullanılacak örnek bir şirket
  let testCompany: CompanyDocument;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Hem Driver hem de Company modellerini alıyoruz
    companyModel = moduleFixture.get<Model<CompanyDocument>>(getModelToken(Company.name));
    driverModel = moduleFixture.get<Model<DriverDocument>>(getModelToken(Driver.name));
    connection = moduleFixture.get<Connection>(getConnectionToken());

    await connection.collection('companies').deleteMany({});
    await connection.collection('drivers').deleteMany({});
  });

  // Her testten önce, testte kullanmak için bir şirket oluşturuyoruz
  beforeEach(async () => {
    await companyModel.deleteMany({});
    await driverModel.deleteMany({});
    testCompany = await companyModel.create({ name: 'Ana Nakliyat', name_normalized: 'ananakliyat' });
  });

  // Her testten sonra hem drivers hem de companies koleksiyonlarını temizliyoruz
  // afterEach(async () => {
  //   await connection.collection('drivers').deleteMany({});
  //   await connection.collection('companies').deleteMany({});
  // });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('POST /drivers', () => {
    it('should create a new driver', async () => {
      const createDriverDto = {
        full_name: 'Ahmet Yılmaz',
        phone_number: '5551112233',
        company: testCompany._id.toString(), // Var olan şirketin ID'sini kullanıyoruz
      };

      const response = await request(app.getHttpServer())
        .post('/drivers')
        .send(createDriverDto)
        .expect(201);

      expect(response.body.full_name).toEqual(createDriverDto.full_name);
      // Dönen cevaptaki company ID'sinin doğru olduğunu kontrol et
      expect(response.body.company).toEqual(testCompany._id.toString());
    });

    it('should fail to create a driver with a non-existent company ID', async () => {
      const nonExistentCompanyId = new Types.ObjectId().toHexString();
      const createDriverDto = {
        full_name: 'Veli Demir',
        company: nonExistentCompanyId, // Var olmayan bir ID
      };

      // Servisiniz, var olmayan bir companyId için hata fırlatmalı (400 veya 404)
      await request(app.getHttpServer())
        .post('/drivers')
        .send(createDriverDto)
        .expect(400); // Veya 404, servisteki mantığınıza göre
    });
  });

  describe('Validation & Constraints', () => {
    it('should return 400 if full_name is missing', async () => {
      const dto = { company: testCompany._id.toString() };
      await request(app.getHttpServer())
        .post('/drivers')
        .send(dto)
        .expect(400);
    });

    it('should return 400 if company is missing', async () => {
      const dto = { full_name: 'Eksik Company' };
      await request(app.getHttpServer())
        .post('/drivers')
        .send(dto)
        .expect(400);
    });

    it('should return 400 if company is not a valid ObjectId', async () => {
      const dto = { full_name: 'Hatalı Company', company: 'notanid' };
      await request(app.getHttpServer())
        .post('/drivers')
        .send(dto)
        .expect(400);
    });

    it('should return 400 or 409 if phone_number is not unique', async () => {
      const dto = { full_name: 'Ali', company: testCompany._id.toString(), phone_number: '5551234567' };
      await request(app.getHttpServer())
        .post('/drivers')
        .send(dto)
        .expect(201);
      // Aynı telefonla tekrar eklenirse hata beklenir
      await request(app.getHttpServer())
        .post('/drivers')
        .send(dto)
        .expect((res) => {
          expect([400, 409]).toContain(res.status);
        });
    });
  });

  describe('GET /drivers', () => {
    it('should return an array of drivers', async () => {
      await driverModel.create({ full_name: 'Test Sürücü', company: testCompany._id });
      const response = await request(app.getHttpServer())
        .get('/drivers')
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /drivers/:id', () => {
    it('should return a driver by id', async () => {
      const driver = await driverModel.create({ full_name: 'Tekil Sürücü', company: testCompany._id });
      const response = await request(app.getHttpServer())
        .get(`/drivers/${driver._id}`)
        .expect(200);
      expect(response.body.full_name).toEqual(driver.full_name);
    });
    it('should return 404 if driver not found', async () => {
      const invalidId = new Types.ObjectId().toHexString();
      await request(app.getHttpServer())
        .get(`/drivers/${invalidId}`)
        .expect(404);
    });
  });

  describe('PATCH /drivers/:id', () => {
    it('should update a driver', async () => {
      const driver = await driverModel.create({ full_name: 'Güncellenecek', company: testCompany._id });
      const updateDto = { full_name: 'Güncellendi' };
      const response = await request(app.getHttpServer())
        .patch(`/drivers/${driver._id}`)
        .send(updateDto)
        .expect(200);
      expect(response.body.full_name).toEqual(updateDto.full_name);
    });
  });

  describe('DELETE /drivers/:id', () => {
    it('should soft delete a driver', async () => {
      const driver = await driverModel.create({ full_name: 'Silinecek', company: testCompany._id });
      const response = await request(app.getHttpServer())
        .delete(`/drivers/${driver._id}`)
        .expect(200);
      expect(response.body.deleted).toBe(true);
      const driverInDb = await driverModel.findById(driver._id);
      expect(driverInDb!.deleted).toBe(true);
    });
  });

  describe('Soft deleted drivers', () => {
    let deletedDriver: DriverDocument;
    beforeEach(async () => {
      deletedDriver = await driverModel.create({ full_name: 'Silinmiş Sürücü', company: testCompany._id, deleted: true });
    });
    it('should not list soft deleted drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/drivers')
        .expect(200);
      expect(response.body.find((d: any) => d._id === deletedDriver._id.toString())).toBeUndefined();
    });
  });
});