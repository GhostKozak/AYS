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

describe('TripsService', () => {
  let service: TripsService;
  let tripModel: any;

  beforeEach(async () => {
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
        getMockProvider(AuditService, mockAuditService()),
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
  });

  describe('findOne', () => {
    it('should find and return a trip by ID', async () => {
        const tripId = new Types.ObjectId().toString();
        const trip = { _id: tripId, deleted: false };

        tripModel.findById.mockReturnValue(mockQuery(trip));

        const result = await service.findOne(tripId, true);
        expect(result).toEqual(trip);
        expect(tripModel.findById).toHaveBeenCalledWith(tripId);
    });

    it('should throw NotFoundException if trip not found or deleted', async () => {
        const tripId = new Types.ObjectId().toString();
        tripModel.findById.mockReturnValue(mockQuery(null));
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
});