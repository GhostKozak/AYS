import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleType } from './enums/vehicleTypes';
import { Types } from 'mongoose';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';

const vehiclesServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('VehiclesController', () => {
  let controller: VehiclesController;
  let service: jest.Mocked<VehiclesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        {
          provide: VehiclesService,
          useValue: vehiclesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
    service = module.get(VehiclesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vehicle', async () => {
      const createVehicleDto: CreateVehicleDto = {
        licence_plate: '34ABC123',
        vehicle_type: VehicleType.TRUCK,
      };
      const expectedVehicle = { _id: new Types.ObjectId(), ...createVehicleDto, deleted: false };
      service.create.mockResolvedValue(expectedVehicle as any);

      const result = await controller.create(createVehicleDto);

      expect(result).toEqual(expectedVehicle);
      expect(service.create).toHaveBeenCalledWith(createVehicleDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of vehicles', async () => {
      const paginationQuery: PaginationQueryDto = { limit: 10, offset: 0 };
      const filterVehicleDto: FilterVehicleDto = { vehicle_type: VehicleType.VAN };
      const expectedVehicles = [{ _id: new Types.ObjectId(), licence_plate: '34DEF456', deleted: false }];
      service.findAll.mockResolvedValue(expectedVehicles as any);

      const result = await controller.findAll(paginationQuery, filterVehicleDto);

      expect(result).toEqual(expectedVehicles);
      expect(service.findAll).toHaveBeenCalledWith(paginationQuery, filterVehicleDto);
    });
  });

  describe('findOne', () => {
    it('should return a single vehicle', async () => {
      const vehicleId = new Types.ObjectId().toString();
      const expectedVehicle = { _id: vehicleId, licence_plate: '34GHI789', deleted: false };
      service.findOne.mockResolvedValue(expectedVehicle as any);

      const result = await controller.findOne(vehicleId);

      expect(result).toEqual(expectedVehicle);
      expect(service.findOne).toHaveBeenCalledWith(vehicleId);
    });
  });

  describe('update', () => {
    it('should update a vehicle', async () => {
      const vehicleId = new Types.ObjectId().toString();
      const updateVehicleDto: UpdateVehicleDto = { vehicle_type: VehicleType.LORRY };
      const expectedVehicle = { _id: vehicleId, ...updateVehicleDto, deleted: false };
      service.update.mockResolvedValue(expectedVehicle as any);

      const result = await controller.update(vehicleId, updateVehicleDto);
      expect(result).toEqual(expectedVehicle);
      expect(service.update).toHaveBeenCalledWith(vehicleId, updateVehicleDto);
    });
  });

  describe('remove', () => {
    it('should soft delete a vehicle', async () => {
      const vehicleId = new Types.ObjectId().toString();
      const expectedVehicle = { _id: vehicleId, licence_plate: '34JKL012', deleted: true };
      service.remove.mockResolvedValue(expectedVehicle as any);

      const result = await controller.remove(vehicleId);
      expect(result).toEqual(expectedVehicle);
      expect(service.remove).toHaveBeenCalledWith(vehicleId);
    });
  });
});