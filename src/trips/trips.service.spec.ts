import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TripsService } from './trips.service';
import { Trip } from './schema/trips.schema';
import { TripEntityResolverService } from './trip-entity-resolver.service';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateTripDto } from './dto/create-trip.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventsGateway } from '../events/events.gateway';
import {
  mockI18nService,
  mockAuditService,
  mockModel,
  mockQuery,
  getMockProvider,
} from '../common/test/test-utils';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';

const companiesServiceMock = {
  findOrCreateByName: jest.fn(),
  findOne: jest.fn(),
  searchByName: jest.fn(),
};

const driversServiceMock = {
  findByPhone: jest.fn(),
  findOrCreateByPhone: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  findDriverByNameOrPhone: jest.fn(),
};

const vehiclesServiceMock = {
  findOrCreateByPlate: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const mockCacheManager = {
  clear: jest.fn(),
  reset: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockEventsGateway = {
  emitTripCreated: jest.fn(),
  emitTripUpdated: jest.fn(),
  emitTripDeleted: jest.fn(),
};

describe('TripsService', () => {
  let service: TripsService;
  let tripModel: any;
  let auditService: any;

  beforeEach(async () => {
    auditService = mockAuditService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        TripEntityResolverService,
        {
          provide: getModelToken(Trip.name),
          useValue: mockModel(),
        },
        {
          provide: CompaniesService,
          useValue: companiesServiceMock,
        },
        {
          provide: DriversService,
          useValue: driversServiceMock,
        },
        {
          provide: VehiclesService,
          useValue: vehiclesServiceMock,
        },
        getMockProvider(I18nService, mockI18nService()),
        getMockProvider(AuditService, auditService),
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    tripModel = module.get(getModelToken(Trip.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new trip with existing driver, company and vehicle', async () => {
      const createTripDto: CreateTripDto = {
        driver_phone_number: '5551112233',
        company_name: 'Existing Company',
        licence_plate: '34ABC123',
        arrival_time: new Date().toISOString(),
      };

      const company = { _id: new Types.ObjectId(), name: 'Existing Company' };
      const driver = { _id: new Types.ObjectId(), phone_number: '5551112233' };
      const vehicle = { _id: new Types.ObjectId(), licence_plate: '34ABC123' };

      tripModel.findOne.mockReturnValue(mockQuery(null));

      companiesServiceMock.findOrCreateByName.mockResolvedValue(company as any);
      driversServiceMock.findByPhone.mockResolvedValue(driver as any);
      vehiclesServiceMock.findOrCreateByPlate.mockResolvedValue(vehicle as any);

      const saveMock = jest.fn().mockResolvedValue({});
      tripModel.mockReturnValue({ save: saveMock });

      await service.create(createTripDto);

      expect(companiesServiceMock.findOrCreateByName).toHaveBeenCalledWith(
        createTripDto.company_name,
      );
      expect(driversServiceMock.findByPhone).toHaveBeenCalledWith(
        createTripDto.driver_phone_number,
      );
      expect(vehiclesServiceMock.findOrCreateByPlate).toHaveBeenCalledWith(
        createTripDto.licence_plate,
        undefined,
      );
      expect(tripModel).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
    });

    it('should create a new trip and a new driver if driver does not exist', async () => {
      const createTripDto: CreateTripDto = {
        driver_phone_number: '5554445566',
        driver_full_name: 'New Driver',
        company_name: 'Test Company',
        licence_plate: '34DEF456',
        arrival_time: new Date().toISOString(),
      };

      const company = { _id: new Types.ObjectId() };
      const newDriver = { _id: new Types.ObjectId(), full_name: 'New Driver' };
      const vehicle = { _id: new Types.ObjectId() };

      tripModel.findOne.mockReturnValue(mockQuery(null));

      companiesServiceMock.findOrCreateByName.mockResolvedValue(company as any);
      driversServiceMock.findOrCreateByPhone.mockResolvedValue(
        newDriver as any,
      );
      vehiclesServiceMock.findOrCreateByPlate.mockResolvedValue(vehicle as any);

      const saveMock = jest.fn().mockResolvedValue({});
      tripModel.mockReturnValue({ save: saveMock });

      await service.create(createTripDto);

      expect(driversServiceMock.findOrCreateByPhone).toHaveBeenCalledWith(
        createTripDto.driver_phone_number,
        createTripDto.driver_full_name,
        company._id.toString(),
      );
      expect(tripModel).toHaveBeenCalled();
    });

    it('should throw BadRequestException if new driver name is not provided for unknown phone', async () => {
      const createTripDto: CreateTripDto = {
        driver_phone_number: '5557778899',
        company_name: 'Another Company',
        licence_plate: '34GHI789',
        arrival_time: new Date().toISOString(),
      };

      companiesServiceMock.findOrCreateByName.mockResolvedValue({
        _id: new Types.ObjectId(),
      } as any);
      driversServiceMock.findByPhone.mockResolvedValue(null);

      await expect(service.create(createTripDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if an active trip exists within 14 days', async () => {
      const createTripDto: CreateTripDto = {
        driver: new Types.ObjectId().toString(),
        company: new Types.ObjectId().toString(),
        vehicle: new Types.ObjectId().toString(),
        arrival_time: new Date().toISOString(),
      };

      const company = { _id: createTripDto.company };
      const driver = { _id: createTripDto.driver };
      const vehicle = { _id: createTripDto.vehicle };
      const activeTrip = {
        _id: new Types.ObjectId(),
        is_trip_canceled: false,
        unload_status: 'IN_TRANSIT',
      };

      companiesServiceMock.findOne.mockResolvedValue(company as any);
      driversServiceMock.findOne.mockResolvedValue(driver as any);
      vehiclesServiceMock.findOne.mockResolvedValue(vehicle as any);

      tripModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(activeTrip),
      });

      await expect(service.create(createTripDto)).rejects.toThrow(
        'trip.CONFLICT_TRIP',
      );
    });

    it('should throw BadRequestException if company ID is missing and company_name is not provided', async () => {
      const createTripDto: CreateTripDto = {
        driver: new Types.ObjectId().toString(),
        vehicle: new Types.ObjectId().toString(),
        arrival_time: new Date().toISOString(),
      };
      await expect(service.create(createTripDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should find and return a trip by ID', async () => {
      const tripId = new Types.ObjectId().toString();
      const trip = { _id: tripId, deleted: false };

      tripModel.findOne.mockReturnValue(mockQuery(trip));

      const result = await service.findOne(tripId, true);
      expect(result).toEqual(trip);
      expect(tripModel.findOne).toHaveBeenCalledWith({ _id: tripId });
    });

    it('should throw NotFoundException if trip not found or deleted', async () => {
      const tripId = new Types.ObjectId().toString();
      tripModel.findOne.mockReturnValue(mockQuery(null));
      await expect(service.findOne(tripId, true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPendingVerification', () => {
    it('should return pending trips', async () => {
      const pendingTrips = [
        { _id: '1', status: 'PENDING', is_trip_canceled: false },
      ];
      const count = 1;
      tripModel.find.mockReturnValue(mockQuery(pendingTrips));
      tripModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(count),
      } as any);

      const result = await service.findPendingVerification();
      expect(result).toEqual({ data: pendingTrips, count });
      expect(tripModel.find).toHaveBeenCalledWith({
        $or: [{ status: 'PENDING' }, { status: { $exists: false } }],
        is_trip_canceled: false,
      });
    });

    it('should return empty array when no pending trips', async () => {
      const count = 0;
      tripModel.find.mockReturnValue(mockQuery([]));
      tripModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(count),
      } as any);

      const result = await service.findPendingVerification();
      expect(result).toEqual({ data: [], count });
    });
  });

  describe('fieldVerify', () => {
    it('should verify a trip and set status to CONFIRMED', async () => {
      const tripId = new Types.ObjectId().toString();
      const sealNumber = 'SEAL-001';
      const photoPath = '/uploads/photo.jpg';
      const user = { _id: 'admin-id' };

      const existingTrip = {
        _id: tripId,
        status: 'PENDING',
        is_trip_canceled: false,
      };
      const updatedTrip = {
        ...existingTrip,
        status: 'CONFIRMED',
        seal_number: sealNumber,
        field_photo_path: photoPath,
        field_verified_at: expect.any(Date),
      };

      tripModel.findOne.mockReturnValue(mockQuery(existingTrip));
      tripModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedTrip),
      });

      const result = await service.fieldVerify(
        tripId,
        sealNumber,
        photoPath,
        user,
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(result).toEqual(updatedTrip);
      expect(tripModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: tripId },
        {
          status: 'CONFIRMED',
          seal_number: sealNumber,
          field_photo_path: photoPath,
          field_verified_at: expect.any(Date),
        },
        { new: true, returnDocument: 'after' },
      );
      expect(auditService.log).toHaveBeenCalled();
      expect(mockEventsGateway.emitTripUpdated).toHaveBeenCalled();
    });

    it('should throw ConflictException if trip is already verified or canceled', async () => {
      const tripId = new Types.ObjectId().toString();
      const existingTrip = {
        _id: tripId,
        status: 'CONFIRMED',
        is_trip_canceled: false,
      };

      tripModel.findOne.mockReturnValue(mockQuery(existingTrip));

      await expect(
        service.fieldVerify(tripId, 'SEAL-001', '/photo.jpg'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if trip is canceled', async () => {
      const tripId = new Types.ObjectId().toString();
      const existingTrip = {
        _id: tripId,
        status: 'PENDING',
        is_trip_canceled: true,
      };

      tripModel.findOne.mockReturnValue(mockQuery(existingTrip));

      await expect(
        service.fieldVerify(tripId, 'SEAL-001', '/photo.jpg'),
      ).rejects.toThrow('Canceled trips cannot be verified.');
    });

    it('should throw NotFoundException if trip not found', async () => {
      const tripId = new Types.ObjectId().toString();
      tripModel.findOne.mockReturnValue(mockQuery(null));

      await expect(
        service.fieldVerify(tripId, 'SEAL-001', '/photo.jpg'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a trip', async () => {
      const tripId = new Types.ObjectId().toString();
      const deletedTrip = { _id: tripId, deleted: true };

      tripModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedTrip),
      } as any);

      const result = await service.remove(tripId);

      expect(result).toEqual(deletedTrip);
      expect(tripModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: tripId },
        { deleted: true },
        { new: true },
      );
    });

    it('should throw NotFoundException if trip to remove is not found', async () => {
      const tripId = new Types.ObjectId().toString();
      tripModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      await expect(service.remove(tripId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paged trips with filters', async () => {
      const pagination = { limit: 5, offset: 0 };
      const filter = { search: 'test' };
      const trips = [{ _id: '1' }];

      driversServiceMock.findDriverByNameOrPhone.mockResolvedValue({
        data: [],
        count: 0,
      });
      companiesServiceMock.searchByName.mockResolvedValue({
        data: [],
        count: 0,
      });
      vehiclesServiceMock.findAll.mockResolvedValue({ data: [], count: 0 });

      tripModel.find.mockReturnValue(mockQuery(trips));
      tripModel.countDocuments.mockReturnValue(mockQuery(1));

      const result = await service.findAll(pagination, filter);

      expect(result.data).toEqual(trips);
      expect(result.count).toBe(1);
      expect(tripModel.find).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a trip and log audit', async () => {
      const tripId = new Types.ObjectId().toString();
      const updateDto = { notes: 'updated' };
      const oldTrip = { _id: tripId, notes: 'old' };
      const updatedTrip = { _id: tripId, notes: 'updated' };
      const user = { _id: 'admin-id' };

      tripModel.findOne.mockReturnValue(mockQuery(oldTrip));
      tripModel.findOneAndUpdate.mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedTrip),
      });

      const result = await service.update(tripId, updateDto, user);

      await new Promise((resolve) => setImmediate(resolve));

      expect(result).toEqual(updatedTrip);
      expect(auditService.log).toHaveBeenCalled();
    });
  });
});
