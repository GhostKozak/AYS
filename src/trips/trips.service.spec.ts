import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trip } from './schema/trips.schema';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const tripModelStatics = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
};
const tripModelConstructor = jest.fn().mockImplementation(() => ({
  save: jest.fn(),
}));
const tripModelMock = Object.assign(tripModelConstructor, tripModelStatics);

const companiesServiceMock = {
  findOrCreateByName: jest.fn(),
};

const driversServiceMock = {
  findByPhone: jest.fn(),
  create: jest.fn(),
};

const vehiclesServiceMock = {
  findOrCreateByPlate: jest.fn(),
};

describe('TripsService', () => {
  let service: TripsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: getModelToken(Trip.name),
          useValue: tripModelMock,
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
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
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
      
      companiesServiceMock.findOrCreateByName.mockResolvedValue(company as any);
      driversServiceMock.findByPhone.mockResolvedValue(driver as any);
      vehiclesServiceMock.findOrCreateByPlate.mockResolvedValue(vehicle as any);

      const saveMock = jest.fn().mockResolvedValue({});
      (tripModelMock as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      await service.create(createTripDto);

      expect(companiesServiceMock.findOrCreateByName).toHaveBeenCalledWith(createTripDto.company_name);
      expect(driversServiceMock.findByPhone).toHaveBeenCalledWith(createTripDto.driver_phone_number);
      expect(vehiclesServiceMock.findOrCreateByPlate).toHaveBeenCalledWith(createTripDto.licence_plate, undefined);
      expect(tripModelConstructor).toHaveBeenCalled();
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
        
        companiesServiceMock.findOrCreateByName.mockResolvedValue(company as any);
        driversServiceMock.findByPhone.mockResolvedValue(null);
        driversServiceMock.create.mockResolvedValue(newDriver as any);
        vehiclesServiceMock.findOrCreateByPlate.mockResolvedValue(vehicle as any);

        const saveMock = jest.fn().mockResolvedValue({});
        (tripModelMock as jest.Mock).mockImplementation(() => ({
          save: saveMock,
        }));

        await service.create(createTripDto);

        expect(driversServiceMock.findByPhone).toHaveBeenCalledWith(createTripDto.driver_phone_number);
        expect(driversServiceMock.create).toHaveBeenCalledWith({
            full_name: createTripDto.driver_full_name,
            phone_number: createTripDto.driver_phone_number,
            company: company._id.toString(),
        });
        expect(tripModelConstructor).toHaveBeenCalled();
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

        tripModelMock.findById.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(trip),
        } as any);

        const result = await service.findOne(tripId);
        expect(result).toEqual(trip);
        expect(tripModelMock.findById).toHaveBeenCalledWith(tripId);
    });

    it('should throw NotFoundException if trip not found or deleted', async () => {
        const tripId = new Types.ObjectId().toString();
        tripModelMock.findById.mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null),
        } as any);
        await expect(service.findOne(tripId)).rejects.toThrow(NotFoundException);
    });
  });

    describe('remove', () => {
        it('should soft delete a trip', async () => {
            const tripId = new Types.ObjectId().toString();
            const deletedTrip = { _id: tripId, deleted: true };

            tripModelMock.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(deletedTrip),
            } as any);
            
            const result = await service.remove(tripId);

            expect(result).toEqual(deletedTrip);
            expect(tripModelMock.findByIdAndUpdate).toHaveBeenCalledWith(tripId, { deleted: true }, { new: true });
        });

        it('should throw NotFoundException if trip to remove is not found', async () => {
            const tripId = new Types.ObjectId().toString();
             tripModelMock.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            } as any);
            await expect(service.remove(tripId)).rejects.toThrow(NotFoundException);
        });
    });
});