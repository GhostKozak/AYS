import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './schema/vehicles.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';
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
  emitVehicleUpdated: jest.fn(),
};

describe('VehiclesService', () => {
  let service: VehiclesService;
  let model: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getModelToken(Vehicle.name),
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

    service = module.get<VehiclesService>(VehiclesService);
    model = module.get(getModelToken(Vehicle.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all vehicles', async () => {
      const mockedResult = {
        data: [{ licence_plate: '34ABC123' }],
        count: 1,
      };
      model.find.mockReturnValue(mockQuery(mockedResult.data));
      model.countDocuments.mockReturnValue(mockQuery(mockedResult.count));

      const paginationQuery: PaginationQueryDto = {};
      const filterVehicleDto: FilterVehicleDto = {};

      const result = await service.findAll(paginationQuery, filterVehicleDto);
      expect(result).toEqual(mockedResult);
    });
  });
});
