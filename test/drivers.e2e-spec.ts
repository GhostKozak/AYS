import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Driver, DriverDocument } from '../src/drivers/schemas/driver.schema';
import { Company, CompanyDocument } from '../src/companies/schemas/company.schema';
import { MongoExceptionFilter } from '../src/filters/mongo-exception.filter';

describe('DriversController (e2e)', () => {
  let app: INestApplication;
  let driverModel: Model<DriverDocument>;
  let companyModel: Model<CompanyDocument>;
  let connection: Connection;

  let testCompany: CompanyDocument;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new MongoExceptionFilter());
    await app.init();

    companyModel = moduleFixture.get<Model<CompanyDocument>>(getModelToken(Company.name));
    driverModel = moduleFixture.get<Model<DriverDocument>>(getModelToken(Driver.name));
    connection = moduleFixture.get<Connection>(getConnectionToken());
  });

  beforeEach(async () => {
    testCompany = await companyModel.create({ name: 'Test Company' });
  });

  afterEach(async () => {
    await connection.collection('drivers').deleteMany({});
    await connection.collection('companies').deleteMany({});
    testCompany = undefined as any;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /drivers', () => {
    it('should create a new driver', async () => {
      const createDriverDto = {
        full_name: 'John Doe',
        phone_number: '5551112233',
        company: testCompany._id.toString(),
      };

      const response = await request(app.getHttpServer())
        .post('/drivers')
        .send(createDriverDto)
        .expect(201);

      expect(response.body.full_name).toEqual(createDriverDto.full_name);
      expect(response.body.company).toEqual(testCompany._id.toString());
    });

    it('should fail to create a driver with a non-existent company ID', async () => {
      const nonExistentCompanyId = new Types.ObjectId().toHexString();
      const createDriverDto = {
        full_name: 'Jane Smith',
        company: nonExistentCompanyId,
      };

      await request(app.getHttpServer())
        .post('/drivers')
        .send(createDriverDto)
        .expect(404);
    });
  });

  describe('GET /drivers', () => {
    it('should return an array of drivers', async () => {
      await driverModel.create({ full_name: 'Test Driver', company: testCompany._id });
      const response = await request(app.getHttpServer())
        .get('/drivers')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  
  describe('Soft deleted drivers', () => {
    let deletedDriver: DriverDocument;
    beforeEach(async () => {
      deletedDriver = await driverModel.create({ full_name: 'Deleted Driver', company: testCompany._id, deleted: true });
    });
    it('should not list soft deleted drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/drivers')
        .expect(200);
      
      expect(response.body.data.find((d: any) => d._id === deletedDriver._id.toString())).toBeUndefined();
    });
  });
});