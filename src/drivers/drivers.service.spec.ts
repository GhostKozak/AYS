import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DriversService } from './drivers.service';
import { Driver } from './schemas/driver.schema';
import { CompaniesService } from '../companies/companies.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterDriverDto } from './dto/filter-driver.dto';
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
  emitDriverUpdated: jest.fn(),
};

const companiesServiceMock = {
  findOne: jest.fn(),
};

describe('DriversService', () => {
  let service: DriversService;
  let driverModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getModelToken(Driver.name), useValue: mockModel() },
        { provide: CompaniesService, useValue: companiesServiceMock },
        getMockProvider(I18nService, mockI18nService()),
        getMockProvider(AuditService, mockAuditService()),
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get(DriversService);
    driverModel = module.get(getModelToken(Driver.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all drivers', async () => {
      const mockedResult = {
        data: [
          {
            company: new Types.ObjectId().toString(),
            full_name: 'Driver #1',
            phone_number: '5551111111',
            deleted: false,
          },
          {
            company: new Types.ObjectId().toString(),
            full_name: 'Driver #2',
            phone_number: '5552222222',
            deleted: false,
          },
        ],
        count: 2,
      };

      driverModel.find.mockReturnValue(mockQuery(mockedResult.data));
      driverModel.countDocuments.mockReturnValue(mockQuery(mockedResult.count));

      const paginationQuery: PaginationQueryDto = {};
      const filterDriverDto: FilterDriverDto = {};
      const result = await service.findAll(paginationQuery, filterDriverDto);

      expect(result).toEqual(mockedResult);
      expect(driverModel.find).toHaveBeenCalled();
    });
  });
});
