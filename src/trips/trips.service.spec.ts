import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TripsService } from './trips.service';
import { Trip } from './schema/trips.schema';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { 
  mockI18nService, 
  mockAuditService, 
  mockModel, 
  mockQuery,
  getMockProvider 
} from '../common/test/test-utils';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';

const companiesServiceMock = {
  findOrCreateByName: jest.fn(),
  findOne: jest.fn(),
};

const driversServiceMock = {
  findByPhone: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const vehiclesServiceMock = {
  findOrCreateByPlate: jest.fn(),
  findOne: jest.fn(),
};

const mockCacheManager = {
  clear: jest.fn(),
  reset: jest.fn(), // for compatibility check
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
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
      };

      const company = { _id: new Types.ObjectId(), name: 'Existing Company' };
      const driver = { _id: new Types.ObjectId(), phone_number: '5551112233' };
      const vehicle = { _id: new Types.ObjectId(), licence_plate: '34ABC123' };
      
      tripModel.findOne.mockReturnValue(mockQuery(null));

      companiesServiceMock.findOrCreateByName.mockResolvedValue(company as any);
      driversServiceMock.findByPhone.mockResolvedValue(driver as any);
      vehiclesServiceMock.findOrCreateByPlate.mockResolvedValue(vehicle as any);

      const saveMock = jest.fn().mockResolvedValue({});
      tripModel.mockReturnValue({
        save: saveMock,
      });

      await service.create(createTripDto);

      expect(companiesServiceMock.findOrCreateByName).toHaveBeenCalledWith(createTripDto.company_name);
      expect(driversServiceMock.findByPhone).toHaveBeenCalledWith(createTripDto.driver_phone_number);
      expect(vehiclesServiceMock.findOrCreateByPlate).toHaveBeenCalledWith(createTripDto.licence_plate, undefined);
      expect(tripModel).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
    });

    it('should create a new trip and a new driver if driver does not exist', async () => {
        const createTripDto: CreateTripDto = {
            driver_phone_number: '5554445566',
            driver_full_name: 'New Driver',
            company_name: 'Test Company',
            licence_plate: '34DEF456',
        };

        const company = { _id: new Types.ObjectId() };
        const newDriver = { _id: new Types.ObjectId(), full_name: 'New Driver' };
        const vehicle = { _id: new Types.ObjectId() };
        
        tripModel.findOne.mockReturnValue(mockQuery(null));

        companiesServiceMock.findOrCreateByName.mockResolvedValue(company as any);
        driversServiceMock.findByPhone.mockResolvedValue(null);
        driversServiceMock.create.mockResolvedValue(newDriver as any);
        vehiclesServiceMock.findOrCreateByPlate.mockResolvedValue(vehicle as any);

        const saveMock = jest.fn().mockResolvedValue({});
        tripModel.mockReturnValue({
          save: saveMock,
        });

        await service.create(createTripDto);

        expect(driversServiceMock.findByPhone).toHaveBeenCalledWith(createTripDto.driver_phone_number);
        expect(driversServiceMock.create).toHaveBeenCalledWith({
            full_name: createTripDto.driver_full_name,
            phone_number: createTripDto.driver_phone_number,
            company: company._id.toString(),
        });
        expect(tripModel).toHaveBeenCalled();
    });

    it('should throw BadRequestException if new driver name is not provided', async () => {
        const createTripDto: CreateTripDto = {
            driver_phone_number: '5557778899',
            company_name: 'Another Company',
            licence_plate: '34GHI789',
        };
        
        driversServiceMock.findByPhone.mockResolvedValue(null);

        await expect(service.create(createTripDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if an active trip exists within 14 days', async () => {
      const createTripDto: CreateTripDto = {
        driver: new Types.ObjectId().toString(),
        company: new Types.ObjectId().toString(),
        vehicle: new Types.ObjectId().toString(),
      };

      const company = { _id: createTripDto.company };
      const driver = { _id: createTripDto.driver };
      const vehicle = { _id: createTripDto.vehicle };
      const activeTrip = { 
        _id: new Types.ObjectId(), 
        is_trip_canceled: false, 
        unload_status: 'IN_TRANSIT' 
      };

      companiesServiceMock.findOne.mockResolvedValue(company as any);
      driversServiceMock.findOne.mockResolvedValue(driver as any);
      vehiclesServiceMock.findOne.mockResolvedValue(vehicle as any);
      
      // Mock the tripModel.findOne for conflict check
      tripModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(activeTrip)
      });

      await expect(service.create(createTripDto)).rejects.toThrow('trip.CONFLICT_TRIP');
    });

    it('should throw BadRequestException if company ID is missing and company_name is not provided', async () => {
      const createTripDto: CreateTripDto = {
        driver: new Types.ObjectId().toString(),
        vehicle: new Types.ObjectId().toString(),
      };
      await expect(service.create(createTripDto)).rejects.toThrow(BadRequestException);
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
        await expect(service.findOne(tripId, true)).rejects.toThrow(NotFoundException);
    });
  });

    describe('remove', () => {
        it('should soft delete a trip', async () => {
            const tripId = new Types.ObjectId().toString();
            const deletedTrip = { _id: tripId, deleted: true };

            tripModel.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(deletedTrip),
            } as any);
            
            const result = await service.remove(tripId);

            expect(result).toEqual(deletedTrip);
            expect(tripModel.findByIdAndUpdate).toHaveBeenCalledWith(tripId, { deleted: true }, { new: true });
        });

    it('should throw NotFoundException if trip to remove is not found', async () => {
      const tripId = new Types.ObjectId().toString();
      tripModel.findByIdAndUpdate.mockReturnValue({
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
      
      tripModel.find.mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(trips),
      });
      tripModel.countDocuments.mockReturnValue({
        setOptions: jest.fn().mockResolvedValue(1)
      });

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
      tripModel.findByIdAndUpdate.mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedTrip),
      });

      const result = await service.update(tripId, updateDto, user);

      expect(result).toEqual(updatedTrip);
      expect(auditService.log).toHaveBeenCalled();
    });
  });
});