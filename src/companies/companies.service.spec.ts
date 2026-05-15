import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Company } from './schemas/company.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';
import {
  mockI18nService,
  mockAuditService,
  mockModel,
  mockQuery,
  getMockProvider,
} from '../common/test/test-utils';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';

const mockEventsGateway = {
  emitCompanyUpdated: jest.fn(),
};

describe('CompaniesService', () => {
  let service: CompaniesService;
  let model: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getModelToken(Company.name),
          useValue: mockModel(),
        },
        getMockProvider(I18nService, mockI18nService()),
        getMockProvider(AuditService, mockAuditService()),
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get(CompaniesService);
    model = module.get(getModelToken(Company.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should insert a new company', async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: 'Test Company #1',
      };

      model.findOne.mockReturnValue(mockQuery(null));

      const result = await service.create(createCompanyDto);

      expect(model).toHaveBeenCalledWith(createCompanyDto);
      expect(result.name).toEqual(createCompanyDto.name);
    });
  });

  describe('findAll', () => {
    it('should return all companies', async () => {
      const mockedResult = {
        data: [{ name: 'New Company #1' }, { name: 'New Company #2' }],
        count: 2,
      };
      model.find.mockReturnValue(mockQuery(mockedResult.data));
      model.countDocuments.mockReturnValue(mockQuery(mockedResult.count));

      const paginationQuery: PaginationQueryDto = {};
      const filterCompanyDto: FilterCompanyDto = {};

      const result = await service.findAll(paginationQuery, filterCompanyDto);

      expect(result).toEqual(mockedResult);
      expect(model.find).toHaveBeenCalled();
    });
  });
});
