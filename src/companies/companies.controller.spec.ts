import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';

const companiesServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
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
        }
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
      const result = await controller.findAll(paginationQuery, filterCompanyDto);

      expect(result).toEqual(mockedResult);
      expect(service.findAll).toHaveBeenCalledWith(paginationQuery, filterCompanyDto);
    });
  });
});