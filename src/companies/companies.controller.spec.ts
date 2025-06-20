import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

const companiesCompanyMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: jest.Mocked<CompaniesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        CompaniesService,
        {
          provide: CompaniesService,
          useValue: companiesCompanyMock,
        }
      ],
    }).compile();

    controller = module.get(CompaniesController);
    service = module.get(CompaniesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new company', async () => {
      const mockedCompany = {
        name: 'Company #1',
        deleted: false
      };
      service.create.mockResolvedValueOnce(mockedCompany);

      const createCompanyDto: CreateCompanyDto = {
        name: 'Company #1'
      };
      const result = await controller.create(createCompanyDto);

      expect(result).toEqual(mockedCompany);
      expect(service.create).toHaveBeenCalledWith(createCompanyDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of companies', async () => {
      const mockedCompanies = [
        { name: 'Company #1', deleted: false },
        { name: 'Company #2', deleted: false },
        { name: 'Company #3', deleted: false },
      ];
      service.findAll.mockResolvedValueOnce(mockedCompanies);

      const result = await controller.findAll();

      expect(result).toEqual(mockedCompanies);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single company', async () => {
      const mockedCompany = {
        name: 'Company #1',
        deleted: false
      };
      service.findOne.mockResolvedValueOnce(mockedCompany);

      const id = new Types.ObjectId().toString();
      const result = await controller.findOne(id);

      expect(result).toEqual(mockedCompany);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a single company', async () => {
      const mockedCompany = {
        name: 'Company #1',
        deleted: true
      };
      service.update.mockResolvedValueOnce(mockedCompany);

      const id = new Types.ObjectId().toString();
      const updateCompanyDto: CreateCompanyDto = {
        name: 'Great Company #1',
      };
      const result = await controller.update(id, updateCompanyDto);

      expect(result).toEqual(mockedCompany);
      expect(service.update).toHaveBeenCalledWith(id, updateCompanyDto);
    });
  });

  describe('soft delete', () => {
    it('should set deleted to true for a company', async () => {
      const id = new Types.ObjectId().toString();
      const mockedCompany = {
        _id: id,
        name: 'Company To Delete',
        deleted: true,
      };
      service.update.mockResolvedValueOnce(mockedCompany);

      const updateCompanyDto = { deleted: true };
      const result = await controller.update(id, updateCompanyDto);

      expect(result).toEqual(mockedCompany);
      expect(service.update).toHaveBeenCalledWith(id, updateCompanyDto);
    });
  });
});
