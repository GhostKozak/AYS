import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';

import { User, UserRole } from '../users/schemas/user.schema';

import { 
  mockI18nService, 
  getMockProvider 
} from '../common/test/test-utils';
import { I18nService } from 'nestjs-i18n';

const mockUser: User = {
  _id: new Types.ObjectId(),
  full_name: 'Test Admin',
  email: 'admin@test.com',
  password: 'hashedpassword',
  role: UserRole.ADMIN,
  deleted: false,
} as any;

const companiesServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  searchByName: jest.fn(),
};

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: jest.Mocked<CompaniesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: companiesServiceMock,
        },
        getMockProvider(I18nService, mockI18nService()),
      ],
    }).compile();

    controller = module.get(CompaniesController);
    service = module.get(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of companies', async () => {
      const mockedResult = {
        data: [
          { name: 'Company #1', deleted: false },
          { name: 'Company #2', deleted: false },
          { name: 'Company #3', deleted: false },
        ],
        count: 3,
      };
      service.findAll.mockResolvedValueOnce(mockedResult as any);

      const paginationQuery: PaginationQueryDto = {};
      const filterCompanyDto: FilterCompanyDto = {};
      const result = await controller.findAll(paginationQuery, filterCompanyDto, mockUser);

      expect(result).toEqual(mockedResult);
      expect(service.findAll).toHaveBeenCalledWith(paginationQuery, filterCompanyDto, true);
    });
  });

  describe('findOne', () => {
    it('should return a single company', async () => {
      const companyId = new Types.ObjectId().toString();
      const expectedCompany = { _id: companyId, name: 'Company #1', deleted: false };
      service.findOne.mockResolvedValue(expectedCompany as any);

      const result = await controller.findOne(companyId, mockUser);

      expect(result).toEqual(expectedCompany);
      expect(service.findOne).toHaveBeenCalledWith(companyId, true);
    });
  });

  describe('update', () => {
    it('should update a company', async () => {
      const companyId = new Types.ObjectId().toString();
      const updateCompanyDto = { name: 'Updated Company' };
      const expectedCompany = { _id: companyId, ...updateCompanyDto, deleted: false };
      service.update.mockResolvedValue(expectedCompany as any);

      const result = await controller.update(companyId, updateCompanyDto, mockUser);
      expect(result).toEqual(expectedCompany);
      expect(service.update).toHaveBeenCalledWith(companyId, updateCompanyDto, mockUser);
    });
  });
});