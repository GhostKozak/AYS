import { Test, TestingModule } from '@nestjs/testing';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Types } from 'mongoose';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterTripDto } from './dto/filter-trip.dto';

const tripsServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('TripsController', () => {
  let controller: TripsController;
  let service: jest.Mocked<TripsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [
        {
          provide: TripsService,
          useValue: tripsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<TripsController>(TripsController);
    service = module.get(TripsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new trip', async () => {
      const createTripDto: CreateTripDto = {
        driver_phone_number: '5551234567',
        company_name: 'Test Company',
        licence_plate: '34ABC123',
      };
      const expectedTrip = { _id: new Types.ObjectId(), ...createTripDto, deleted: false };
      service.create.mockResolvedValue(expectedTrip as any);

      const result = await controller.create(createTripDto);
      expect(result).toEqual(expectedTrip);
      expect(service.create).toHaveBeenCalledWith(createTripDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of trips', async () => {
        const paginationQuery: PaginationQueryDto = { limit: 10, offset: 0 };
        const filterTripDto: FilterTripDto = {};
      const expectedTrips = [{ _id: new Types.ObjectId(), licence_plate: '34XYZ789', deleted: false }];
      service.findAll.mockResolvedValue(expectedTrips as any);

      const result = await controller.findAll(paginationQuery, filterTripDto);
      expect(result).toEqual(expectedTrips);
      expect(service.findAll).toHaveBeenCalledWith(paginationQuery, filterTripDto);
    });
  });

  describe('findOne', () => {
    it('should return a single trip', async () => {
      const tripId = new Types.ObjectId().toString();
      const expectedTrip = { _id: tripId, licence_plate: '34ABC123', deleted: false };
      service.findOne.mockResolvedValue(expectedTrip as any);

      const result = await controller.findOne(tripId);
      expect(result).toEqual(expectedTrip);
      expect(service.findOne).toHaveBeenCalledWith(tripId);
    });
  });

  describe('update', () => {
    it('should update a trip', async () => {
      const tripId = new Types.ObjectId().toString();
      const updateTripDto: UpdateTripDto = { notes: 'Updated note' };
      const expectedTrip = { _id: tripId, ...updateTripDto, deleted: false };
      service.update.mockResolvedValue(expectedTrip as any);

      const result = await controller.update(tripId, updateTripDto);
      expect(result).toEqual(expectedTrip);
      expect(service.update).toHaveBeenCalledWith(tripId, updateTripDto);
    });
  });

  describe('remove', () => {
    it('should soft delete a trip', async () => {
      const tripId = new Types.ObjectId().toString();
      const expectedTrip = { _id: tripId, licence_plate: '34GHI456', deleted: true };
      service.remove.mockResolvedValue(expectedTrip as any);

      const result = await controller.remove(tripId);
      expect(result).toEqual(expectedTrip);
      expect(service.remove).toHaveBeenCalledWith(tripId);
    });
  });
});