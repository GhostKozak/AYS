import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './schema/vehicles.schema';
import { NotFoundException } from '@nestjs/common';
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
import { SearchCacheRegistryService } from '../search/search-cache-registry.service';

const mockEventsGateway = {
  emitVehicleUpdated: jest.fn(),
};

describe('VehiclesService', () => {
  let service: VehiclesService;
  let model: any;
  let auditService: any;

  beforeEach(async () => {
    auditService = mockAuditService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getModelToken(Vehicle.name),
          useValue: mockModel(),
        },
        getMockProvider(I18nService, mockI18nService()),
        getMockProvider(AuditService, auditService),
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: SearchCacheRegistryService,
          useValue: {
            invalidateSearchCache: jest.fn().mockResolvedValue(undefined),
          },
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

  describe('findOne', () => {
    it('should find and return a vehicle by ID', async () => {
      const vehicleId = '507f1f77bcf86cd799439011';
      const vehicle = { _id: vehicleId, licence_plate: '34ABC123' };

      model.findOne.mockReturnValue(mockQuery(vehicle));

      const result = await service.findOne(vehicleId);
      expect(result).toEqual(vehicle);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      model.findOne.mockReturnValue(mockQuery(null));

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new vehicle with normalized plate', async () => {
      const dto = { licence_plate: ' 34 abc 123 ', vehicle_type: 'TRACTOR' };
      const savedVehicle = {
        _id: 'mock-id',
        licence_plate: '34ABC123',
        vehicle_type: 'TRACTOR',
      };

      const saveMock = jest.fn().mockResolvedValue(savedVehicle);
      model.mockReturnValue({ save: saveMock });

      const result = await service.create(dto as any);

      expect(result).toEqual(savedVehicle);
      expect(model).toHaveBeenCalledWith({
        licence_plate: '34ABC123',
        vehicle_type: 'TRACTOR',
      });
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('findOrCreateByPlate', () => {
    it('should return existing vehicle', async () => {
      const vehicle = {
        _id: '507f1f77bcf86cd799439011',
        licence_plate: '34ABC123',
        deleted: false,
      };

      model.findOne.mockReturnValue(mockQuery(vehicle));

      const result = await service.findOrCreateByPlate('34ABC123');
      expect(result).toEqual(vehicle);
    });

    it('should restore a soft-deleted vehicle', async () => {
      const vehicle = {
        _id: '507f1f77bcf86cd799439011',
        licence_plate: '34ABC123',
        deleted: true,
      };
      const restored = {
        _id: '507f1f77bcf86cd799439011',
        licence_plate: '34ABC123',
        deleted: false,
      };

      model.findOne.mockReturnValue(mockQuery(vehicle));
      model.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(restored),
      });

      const result = await service.findOrCreateByPlate('34ABC123');
      expect(result).toEqual(restored);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: vehicle._id },
        { deleted: false },
        { new: true },
      );
    });

    it('should create a new vehicle when not found', async () => {
      model.findOne.mockReturnValue(mockQuery(null));

      const saveMock = jest.fn().mockResolvedValue({
        _id: 'new-id',
        licence_plate: '34ABC123',
        vehicle_type: 'TRACTOR',
      });
      model.mockReturnValue({ save: saveMock });

      const result = await service.findOrCreateByPlate('34ABC123', 'TRACTOR' as any);
      expect(result).toBeDefined();
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a vehicle and log audit', async () => {
      const vehicleId = '507f1f77bcf86cd799439011';
      const updateDto = { vehicle_type: 'TRAILER' };
      const existing = {
        _id: vehicleId,
        licence_plate: '34ABC123',
        vehicle_type: 'TRACTOR',
      };
      const updated = {
        _id: vehicleId,
        licence_plate: '34ABC123',
        vehicle_type: 'TRAILER',
      };

      model.findOne.mockReturnValue(mockQuery(existing));
      model.findOneAndUpdate.mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.update(vehicleId, updateDto as any);

      await new Promise((resolve) => setImmediate(resolve));

      expect(result).toEqual(updated);
      expect(mockEventsGateway.emitVehicleUpdated).toHaveBeenCalledWith(updated);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      model.findOne.mockReturnValue(mockQuery(null));

      await expect(
        service.update('nonexistent', { vehicle_type: 'TRAILER' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a vehicle', async () => {
      const vehicleId = '507f1f77bcf86cd799439011';
      const deleted = { _id: vehicleId, deleted: true };

      model.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deleted),
      });

      const result = await service.remove(vehicleId);
      expect(result).toEqual(deleted);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      model.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
